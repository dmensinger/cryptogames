/********************* Stomps Dice **************************\
*
* Version     : 1.0
* Author      : stomps
*
* This script is an advanced script for playing Hashdice on sites such as bc.game. 
*
* USE AT YOUR OWN RISK
* Does not guarantee you will not lose. 
* This is not a get rich quick script, plan to run it for hours, days, weeks or longer.
*
* For best results run at MAXIMUM of 0.01% of balance
* For example, if your balance is 1 DOGE your bet should never be more than 0.0001 DOGE. Start small!
*
* The script will keep track of what is lost and attempt to always win it back, plus profit.
* It will also randomly make larger bets to increase profit gained.
*
* Important! Set a Stop Loss! Stop loss is how many games in a row during loss recovery.
* The lower your base bet, the less chance you have of hitting your stop loss, but the longer it will take to gain profit. 
*
* Keep dev console open for detailed statistics.
*
* Good Luck
*
*/

var config = {
	preface: { label: 'Important', type: 'title' },
	notice1: { label: 'For best results run at MAXIMUM of 0.01% of balance.', type: 'message' },
	notice2: { label: 'For example, if your balance is 1 DOGE your bet should never bet more than 0.0001 DOGE. A bet of 0.0001 with a balance of 1 will allow 68 games lost in loss recovery mode with default settings. The losses you can sustain in loss recovery mode, the better your odds.', type: 'message' },
	settingsTitle: { label: 'Core Settings', type: 'title' },
	bet: { label: 'Bet', value: currency.minAmount, type: 'number' },
	basePayout: { label: 'Base Payout (generally 1.6 for best results)', value: 1.6, type: 'number' },
	winAdd: { label: 'Win Payout (amount to increase payout by on win)', value: 0.3, type: 'number' },
	stopLoss: { label: 'Stop Loss (highest number of games lost in loss recovery mode before taking loss)', value: 100, type: 'number' },
	customTitle: { label: 'Advanced Customizations', type: 'title' },
	customDesc: { label: 'Adjust the following settings at your own risk.', type: 'message' },
	countLossInit: { value: 8, type: 'number', label: 'Count Loss Init' },
	countLossMax: { value: 30, type: 'number', label: 'Count Loss Max' },
	diceMin: { value: 2, type: 'number', label: 'Dice Roll Min' },
	diceMax: { value: 8, type: 'number', label: 'Dice Roll Max' },
	payoutBonus: { value: 1.2, type: 'number', label: 'Payout Bonus (applied at loss recovery bets for added bonus)' },
	bigWinInit: { value: 3, type: 'number', label: 'Big Win Init (after how many base wins to apply multiplier below)' },
	bigWinAmount: { value: 4, type: 'number', label: 'Big Win Bonus Multiplier (amount to increase payout if going for big wins)' },
};

function main() {
	var currentPayout = config.basePayout.value,
		betAmount = config.bet.value,
		countWin = 0,
		countLoss = 0,
		totalGain = 0,
		gamesPlayed = 0,
		gamesLost = 0,
		roundLoss = 0,
		highestLoss = 0,
		stopLoss = config.stopLoss.value,
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
		bigWinInit = config.bigWinInit.value,
		bonusMultiplier = config.bigWinAmount.value,
		diceRoll,
		diceAttempts = 0,
		diceCount = false,
		diceWins = 0,
		diceWinTotal = 0,
		diceMin = config.diceMin.value,
		diceMax = config.diceMax.value,
		payoutMultiplier = 2,
		payoutBonus = config.payoutBonus.value,
		timesRecovered = 0;

	game.onBet = function () {
		game.bet(betAmount, currentPayout).then(function (payout) {
			gamesPlayed++;

			// we won
			if (payout > 1) {
					
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
					if(countWin > bigWinInit) {
						bigWinAttempts++;
						bonus += bonusMultiplier;
						currentPayout = currentPayout + bonus;
					}

					if(countWin > bigWinInit + 1) {
						bigWins++;
						bigWinTotal += (betAmount * currentPayout) - betAmount;
					}
				
				// Loss recovery
				} else {

					// if countLoss exists
					if(countLoss > 1) {
						
						// If loss fully recovered
						if(currentPayout === (countLoss / payoutMultiplier) + payoutBonus) {
							totalGain = (countLoss / payoutMultiplier) * betAmount;
							countLoss = 0;
							betAmount = config.bet.value * 3;
							timesRecovered++;
							roundLoss = gamesLost;
							if (roundLoss > highestLoss) {
								highestLoss = roundLoss;
							}
							gamesLost = 0;
							log.success('Success! Loss fully recovered! Total gain: ' + totalGain);
						} else {
							countLoss -= 1;
						}

						log.error('Countloss decreased to ' + countLoss);
					
					// if no countLoss, start reduce bet 
					} else {
						betAmount = betAmount / 2;
					}
					
					// reset payout
					currentPayout = config.basePayout.value
				}
				
				log.success('We won');
				log.info('Betting ' + betAmount + ' at ' + currentPayout + ' x');

			// we lost
			} else {

				// reset globals
				countWin = 0;
				bonus = 0;
				diceCount = false;

				// record loss
				profit -= betAmount;

				// reset payout
				currentPayout = config.basePayout.value

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
						gamesLost++;
						log.info('Loss Recovery Games: ' + gamesLost);

						// if we get too high payout, double bet and half payout
						if(countLoss > config.countLossMax.value) {
							betAmount *= 2;
							countLoss /= 2;
						}

						// Count loss got too high, lets up the payout
						currentPayout = (countLoss / payoutMultiplier) + payoutBonus;

						// Stop game if we hit stop loss
						if (gamesLost > stopLoss) {
							log.error('Stop loss hit, GAME OVER!');
							game.stop();
						}
					}
				}

				log.error('We lost');
				log.info('Betting ' + betAmount + ' at ' + currentPayout + ' x');

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
				console.log('~~~ Dice Stats Update  ~~~');
				console.log("Games Played " + gamesPlayed + " Times in " + timeDiff.toFixed(2) + " minutes ");
				console.log("Begining Bank " + startBalance.toFixed(7) + " Current Bank " + currency.amount.toFixed(7) + " " + currency.currencyName);
				console.log("Profit Per Minute " + profitPerMin.toFixed(5) + ' ' + currency.currencyName);
				console.log("Session Net profit " + profit.toFixed(5) + ' ' + currency.currencyName);
				console.log("Big Win Attempts: " + bigWinAttempts);
				console.log("Total Big Wins: " + bigWins + ' | Profit = ' + bigWinTotal);
				console.log("Dice Attempts: " + diceAttempts);
				console.log("Dice Wins: " + diceWins + ' | Profit = ' + diceWinTotal);
				console.log("Times Recovered Loss: " + timesRecovered);
				console.log("Highest Loss Recovery: " + highestLoss);
				console.log('~~~  Update Completed  ~~~');
		
			}

		});
	};
}
