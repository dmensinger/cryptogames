var config = {
	bet: { label: 'bet', value: currency.minAmount, type: 'number' },
	basePayout: { label: 'base payout', value: 1.5, type: 'number' },
	stop: { value: 10000, type: 'number', label: 'stop if payout >' },
	customTitle: { label: 'Customizations', type: 'title' },
	countLossInit: { value: 8 , type: 'number', label: 'Count Loss Init' },
	countLossMax: { value: 30 , type: 'number', label: 'Count Loss Max' },
	diceMin: { value: 2 , type: 'number', label: 'Dice Min' },
	diceMax: { value: 8 , type: 'number', label: 'Dice Max' },
	winAdd: { label: 'win payout +', value: 0.3, type: 'number' }
};

function main() {
	var currentPayout = config.basePayout.value,
		betAmount = config.bet.value,
		countWin = 0,
		countLoss = 0,
		totalGain = 0,
		bonus = 0,
		gamesPlayed = 0,
		startTime = new Date(),
		endTime = new Date(),
		timeDiff = (endTime - startTime),
		startBalance = currency.amount,
		endBalance = 0,
		profit = 0,
		profitPerMin = 0,
		bigWinAttempts = 0,
		bigWins = 0,
		bigWinTotal = 0,
		diceRoll,
		diceAttempts = 0,
		diceCount = false,
		diceWins = 0,
		diceWinTotal = 0,
		diceMin = config.diceMin.value,
		diceMax = config.diceMax.value,
		payoutMultiplier = 2,
		timesRecovered = 0;


	engine.on('GAME_STARTING', function() {
		engine.bet(betAmount, currentPayout);
	});

	engine.on('GAME_ENDED', function() {
		var history = engine.getHistory(),
			lastGame = history[0];

		gamesPlayed++;

		// If we wagered, it means we played
		if (!lastGame.wager) {
			return;
		}

		// we won..
		if (lastGame.cashedAt) {

			// record profit
			profit += (betAmount * currentPayout) - betAmount;

			// account for dice wins
			if(diceCount) {
				diceWins++;
				diceWinTotal += (betAmount * currentPayout) - betAmount;
				log.success('Dice roll won! profit = ' + diceWinTotal);
				diceCount = false;
			}

			// No loss recovery
			if(betAmount <= config.bet.value) {
				countWin++;

				// reset bet amount
				betAmount = config.bet.value;

				// increase payout as per config
				currentPayout += config.winAdd.value;

				// go big
				if(countWin > 3) {
					bigWinAttempts++;
					bonus += 5;
					currentPayout = currentPayout + bonus;
				}

				if(countWin > 4) {
					bigWins++;
					bigWinTotal += (betAmount * currentPayout) - betAmount;
				}
			
			// Loss recovery
			} else {

				// if countLoss exists
				if(countLoss > 1) {
					
					// If loss fully recovered
					if(currentPayout === (countLoss / payoutMultiplier) + 1.2) {
						totalGain = (countLoss / payoutMultiplier) * betAmount;
						countLoss = 0;
						betAmount = config.bet.value * 3;
						timesRecovered++;
						log.success('Success! Loss fully recovered! Total gain: ' + totalGain);
					} else {
						countLoss -= 1;
					}

					log.error('Countloss decreased to ' + countLoss);
				
				// if no countLoss, start reduce bet 
				} else {
					betAmount = betAmount / 2;
				}
				
				currentPayout = 1.6;
			}

			log.success('We won, next payout ' + currentPayout + ' x');
		} else {

			// reset globals
			countWin = 0;
			bonus = 0;
			diceCount = false;

			// record loss
			profit -= betAmount;

			// set payout
			currentPayout = 1.6;

			// if we get to 4 times bet amount lets stop multiplying
			if(betAmount < config.bet.value * 4) {

				// double beta
				betAmount = betAmount * 2;

				// roll dice
				diceRoll = rollDice(1,4);
				log.error('Dice roll:  ' + diceRoll);

				if(diceRoll === 4) {
					currentPayout = rollDice(diceMin, diceMax);
					diceCount = true,
					diceAttempts++;
					log.success('Dice rolled a ' + diceRoll + ', going for bonus win!');
				}

			} else {
				countLoss += 2;
				log.error('Countloss increased to ' + countLoss);

				// If countLoss is too high lets attempt to lower it
				if(countLoss > config.countLossInit.value) {

					// if we get too high payout, double bet and half payout
					if(countLoss > config.countLossMax.value) {
						betAmount *= 2;
						countLoss /= 2;
					}

					// Count loss got too high, lets up the payout
					currentPayout = (countLoss / payoutMultiplier) + 1.2
				}
			}

			log.error('We lost, next payout ' + currentPayout + ' x');
		}

		function rollDice(min, max) {
			return min + Math.floor(Math.random() * (max-min + 1))
		}

		// Logging
		gamesPlayed = gamesPlayed.toString();

		console.log('Games Played: ' + gamesPlayed);

		if (gamesPlayed) {
			endTime = new Date();
			timeDiff = ((endTime - startTime) / 1000 )/ 60;
			endBalance = currency.amount;
			profitPerMin = (profit / timeDiff);

			console.clear();
			console.log('~~~  Crash Stats Update  ~~~');
			console.log("Games Played " + gamesPlayed + " Times in " + timeDiff.toFixed(2) + " minutes ");
			console.log("Begining Bank " + startBalance.toFixed(7) + " Current Bank " + currency.amount.toFixed(7) + " " + currency.currencyName);
			console.log("Profit Per Minute " + profitPerMin.toFixed(5) + ' ' + currency.currencyName);
			console.log("Session Net profit " + profit.toFixed(5) + ' ' + currency.currencyName);
			console.log("Big Win Attempts: " + bigWinAttempts);
			console.log("Total Big Wins: " + bigWins + ' | Profit = ' + bigWinTotal);
			console.log("Dice Attempts: " + diceAttempts);
			console.log("Dice Wins: " + diceWins + ' | Profit = ' + diceWinTotal);
			console.log("Times Recovered Loss: " + timesRecovered);
			console.log('~~~  Update Completed  ~~~');
	
		}

		if (currentPayout > config.stop.value) {
			log.error(
				'Was about to bet with payout' +
					currentPayout +
					'which triggers the stop'
			);
			engine.stop();
		}
		
	});
}