var config = {
	bet: { label: 'bet', value: currency.minAmount, type: 'number' },
	basePayout: { label: 'base payout', value: 1.5, type: 'number' },
	winAdd: { label: 'win payout +', value: 0.3, type: 'number' },
	customTitle: { label: 'Customizations', type: 'title' },
	modeInit: { value: 6 , type: 'number', label: 'Mode Init (Minutes)' },
	countLossMax: { value: 30 , type: 'number', label: 'Count Loss Max' },
	lossRecoveryStart: { value: 8 , type: 'number', label: 'Loss Recovery Start' },
	stopLossStart: { value: 100 , type: 'number', label: 'Stop Loss Start' },
	diceMin: { value: 3 , type: 'number', label: 'Dice Min' },
	diceMax: { value: 12 , type: 'number', label: 'Dice Max' },
};

function main() {
	var currentPayout = config.basePayout.value,
		betAmount = config.bet.value,
		countWin = 0,
		countLoss = 0,
		countLossMax = config.countLossMax.value,
		lossRecoveryStart = config.lossRecoveryStart.value,
		totalLoss = 0,
		totalGain = 0,
		payoutMultiplier,
		bonus = 0,
		gamesPlayed = 0,
		gameMode,
		profitMode = 0,
		modeInit = config.modeInit.value,
		startTime = new Date(),
		endTime = new Date(),
		timeDiff = (endTime - startTime),
		sessionStartTime = new Date(),
		sessionTimeDiff = (endTime - sessionStartTime),
		startBalance = currency.amount,
		endBalance = 0,
		profit = 0,
		sessionProfit = 0,
		sessionProfitHigh = 0,
		profitPerMin = 0,
		maxStopLoss = -(config.stopLossStart.value),
		stopLoss = maxStopLoss,
		stopLossAdjustment = 0,
		session = 1,
		bigWinAttempts = 0,
		bigWins = 0,
		bigWinTotal = 0,
		diceRoll,
		diceAttempts = 0,
		diceCount = false,
		diceWins = 0,
		diceWinTotal = 0;
		diceMin = config.diceMin.value,
		diceMax = config.diceMax.value,
		timesRecovered = 0;


	engine.on('GAME_STARTING', function() {
		engine.bet(betAmount, currentPayout);
	});

	engine.on('GAME_ENDED', function(data) {

		gamesPlayed++;

		// we won..
		if (data.profitAmount > 0) {

			// account for dice wins
			if(diceCount) {
				diceWins++;
				diceWinTotal += (betAmount * currentPayout) - betAmount;
				profit += (betAmount * currentPayout) - betAmount;
				log.success('Dice roll won! Profit = ' + (betAmount * currentPayout) - betAmount);
				diceCount = false;
			} else {
				// record sessionProfit
				sessionProfit += (betAmount * currentPayout) - betAmount;
			}


			// No loss recovery
			if(betAmount <= config.bet.value) {
				countWin++;

				// reset bet amount
				betAmount = config.bet.value;

				// Initiate game modes
				if(sessionTimeDiff > modeInit ) {
					gameMode = 'Profit Mode';
				}

				// increase payout as per config
				currentPayout += config.winAdd.value;

				// go big
				if(countWin > 3) {
					bigWinAttempts++;
					bonus += 1;
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
					if(currentPayout === (countLoss / payoutMultiplier) + 1.1) {
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
					
					// Set min bet amount
					if(betAmount < config.bet.value) {
						betAmount = config.bet.value;
					}
				}
				
				currentPayout = 1.7;
			}

			log.success('We won, next payout ' + currentPayout + ' x');
		} else {

			// reset globals
			countWin = 0;
			bonus = 0;
			diceCount = false;

			// record loss
			sessionProfit -= betAmount;

			// Initiate game modes
			if(sessionTimeDiff < modeInit ) {
				gameMode = 'Initiating';
			}

			if(gameMode == 'Initiating') {

				// if sessionProfit is less than stop loss, take loss
				if(sessionProfit < stopLoss) {
					resetGame();
				}

			} else {

				stopLoss = sessionProfitHigh / 1.15;

				// if sessionProfit is less than stop loss, take gains
				if(sessionProfit < stopLoss) {
					profitMode++;
					resetGame();
				}
			}

			// set payout
			currentPayout = 1.7;

			// if we get to 4 times bet amount lets stop multiplying
			if(betAmount < config.bet.value * 4) {

				// double bet
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
					
				// record sessionProfit at time of first loss
				if(countLoss === 2 || countLoss === 3) {
					sessionProfitHigh = sessionProfit.toFixed(6);
				}

				// If countLoss is too high lets attempt to lower it
				if(countLoss > lossRecoveryStart) {

					payoutMultiplier = 2;
					totalLoss += betAmount;

					// if we get too high payout, double bet and half payout
					if(countLoss > countLossMax) {
						betAmount *= 2;
						countLoss /= 2;
					}

					// Count loss got too high, lets up the payout
					currentPayout = (countLoss / payoutMultiplier) + 1.1 // + 1 so we're making sessionProfit;
				}
			}

			log.error('We lost, next payout ' + currentPayout + ' x');
		}

		function resetGame() {
			session += 1;
			sessionStartTime = new Date();
			sessionTimeDiff = (endTime - sessionStartTime);
			betAmount = config.bet.value;
			countLoss = 0;
			profit += sessionProfit;
			gameMode = 'Initializing';
			sessionProfit = 0;
			sessionProfitHigh = 0;

			if(profit > 0) {
				stopLossAdjustment = profit;

				if(profit > maxStopLoss) {
					stopLossAdjustment = profit / 2;
				}

				if(profit > maxStopLoss * 3) {
					stopLossAdjustment = profit / 4;
				}

			} else {
				stopLossAdjustment = 0;
			}

			stopLoss = maxStopLoss - stopLossAdjustment;
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
			sessionTimeDiff = ((endTime - sessionStartTime) / 1000 )/ 60;
			endBalance = currency.amount;
			profitPerMin = (sessionProfit / timeDiff);

			console.clear();
			console.log('---  Dice Run Details  ---');
			console.log("Games Played " + gamesPlayed + " Times in " + timeDiff.toFixed(2) + " minutes ");
			console.log("Begining Bank " + startBalance.toFixed(7) + " Current Bank " + currency.amount.toFixed(7) + " " + currency.currencyName);
			console.log("Profit Per Minute " + profitPerMin.toFixed(5) + ' ' + currency.currencyName);
			console.log("Big Win Attempts: " + bigWinAttempts);
			console.log("Total Big Wins: " + bigWins + ' | Profit = ' + bigWinTotal);
			console.log("Dice Attempts: " + diceAttempts);
			console.log("Dice Wins: " + diceWins + ' | Profit = ' + diceWinTotal);
			console.log("Profit Modes Achieved: " + profitMode);
			console.log("Times Recovered Loss: " + timesRecovered);
			console.log(' ');
			console.log("Total Profit: " + profit);
			console.log(' ');
			console.log('---  Session Details  ---');
			console.log("Session: " + session);
			console.log("Session Time: " + sessionTimeDiff.toFixed(2) + " minutes ");
			console.log("Game Mode: " + gameMode);
			console.log("Stop Loss: " + stopLoss);
			console.log("Profit Highest: " + sessionProfitHigh + ' ' + currency.currencyName);
			console.log("Net Session Profit " + sessionProfit.toFixed(5) + ' ' + currency.currencyName);
			console.log('---  Update Completed  ---');
	
		}

		
	});
}