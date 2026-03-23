# Battles implementation
Ok, now we are getting to work on battles more carefully. 

## Elements effects on each other
The elements are effecting each other in a specific way. Each element in a sequence "dealing more damage" to the next element. This is the sequence: Water(W) -> Fire(F) -> Air(A) -> Earth(E). Lightning is tricky - it doesn't have any passive bonuses or weakness against the other elements. 

## Elementals stats
I want to keep things simple and for now we just need a flat number per each elemental. Something like power. Let's say 1 lvl elemental is 10 power, 2 lvl - 20 and so on. So if someone is "dealing more damage" let's just add 10% to the power of the attacker. 

## Battle essentials
I want battle to consist of several things: phases and turns.

### Phase 1
Elementals automatically choosing the best target to attack from opponent team. Example: WWFFA vs EEFWW(each letter is the elemental of the element 1 lvl). I'll go one by one letter W->F, W->W, F->E, F->W, A->E. So the idea is that primarily the first elementals to choose targets is the one who can exploit weaknesses on the opposite team. Each attacking elemental is effected by the chosen target. Initially all elementals from the example are power 10. Once W->F it becomes 11 since we attack an opposite element. Same for A->E. The state of elemental attacks setup should be represented in the UI for both parties.
### Phase 2
Players took turns throwing dices one by one until every player had thrown 3 dices. This is the main part of a gameplay. The gamehook of the game. Player should choose an appropriate dice to straighten he's elementals based on the dices affinity. Example: let's continue with the same parties I mentioned on phase 1. I'm the first player, I see that my F elementals are weak in this stack so I'm deciding to throw dice with fire affinity(it's d4 right now). Results that I could get is the next: 
  1. Critical success: Add maximum bonus multiplier from dice stats to all **fire** elementals power in the battle
  2. Success: Add half of bonus multiplier from dice stats to all **fire** elementals power in the battle
  3. Fail: Add half of bonus multiplier from dice stats to all **water** elementals power in the battle
  4. Critical fail: Add maximum bonus multiplier from dice stats to all **water** elementals power in the battle
The only tricky dice is the lightning one. When there's any "success" throw - we simply amplify lightning elementals on the battlefield following the same rules above. But once it's fail - we start to amplify ALL other elements in the battle by quarter of bonus multiplier. Crit fail - half of the bonus multiplier. 
Again these power changes as well as thrown dices should be reflected in the UI after each turn. 

### Phase 3
Battle resolution. Once all the multipliers are applied we sum up power of each elemental and calculate Total party power number. Which one is bigger is the winner party.


# Battles implementation V2.0
## Dices
We are changing dices to a new faces. Instead of numbers we'll start to use elemental signs on them - 🌊, 🔥, 💨, ⛰️, ⚡.
We still want to have same notations maintained so the distribution will be like this:
- d20 - basically flat 5 + 5 + 5 + 5. So we simply repeat each element 4 times. The better quality dice will be the 1 that is including 1 and then 2 elements repeated more then 4 times(5-6). 
- d12 - Again it's 5 + 5 and then 11 and 12 can be any other element. This dice will always be of 1 rarity since the advantage will be varying depending on the player's setup
- d10 - flat 5 + 5. Second tier rarity dice can have 1 of the element to be repeated thrice(and not more).
- d6 - 5 + 1 that can be any element. Rarity is always the same. 
- d4 - All 4 is a different combination of 5 elements. Rarity is always the same. 

## Battle rules
These rules are highly developed on top of Farkle - classic dice game where you throw 6 dices and trying to achieve as high score as possible. Here we are doing the same, but player is trying to roll for a specific element as well.
Battle turn:
0. Choose 1 element that can be "set aside"(see 3.) no matter if it was in the combination or not. This element's dice will solely give elementals 10% bonus.
1. At the beginning of each turn, the player throws all **five** dice at once.
2. After first throw, player can choose to reroll **ONCE** from 1 to 5 dices to achieve some combination
3. One or more dice combination should be set aside. 
4. The player may then either end their turn or roll again the least dices(only after "set aside" action).
5. Combinations that already set aside can be regrouped with rethrown ones.
6. If all 5 dices are participating in a combination - it's a DICE RASH - The player can throw all 5 dices again to accumulate even more bonuses. (start from 1 step saving current bonuses)
7. If no combination in the roll - and you already rerolled once(2 step) - you lose all the bonuses.

Bonuses are applied only to your elementals!

## Dices combinations
- Triplet - 3 dices are showing the same element. +30% to power
- Quartet - 4 dices are showing the same element. +40%
- All-For-One - 5 dices are showing the same element. +50%
- One-For-All - All 5 dices are different from each other - +30% to a chosen element. 
- Full House - Triplet + 2 dices of the same but different from triplet element. +25% for 2 and + 35% for 3 to a respective element.

# Battles implementation V3.0

In this iteration we are trying to add some mechanics from Hearthstone battlegrounds on top of farkle. With the previous implementation our [[#Elements effects on each other]] was removed due to no attacks between the elementals. Now we want them back. 
## Battle updated rules:
1. Choose 1 element that can be set aside no matter if it was in the combination or not. This element element's die will solely give elementals 10% bonus.
2. At the beginning of each turn, the player throws all five dice at once.
3. After the very first throw, player can choose to re-roll from 1 to 5 dices to achieve some combination
4. One or more dice combination can be set aside. 
5. The player may then either end their turn or roll again the least dices(only after "set aside" action).
6. Combinations that already set aside can be regrouped with re-throwned ones.
7. If all 5 dices are participating in a combination - it's a DICE RASH - The player can throw all 5 dices again to accumulate even more bonuses. (start from 1 step saving current bonuses)
8. If no combination in the roll - and you already re-rolled once(2 step) - you lose all the bonuses.
9. At any point after set-aside action player can choose to stop rolling committing he's current bonuses and Deploying the elementals into battle.
10. Deploy into battle means - any set aside die with it's rolled element considered as the elemental that should be deployed into battle(if player have any of such). 
11. If the element is participating in combination - those elementals are empowered by it.  
12. For elementals of lvl 3 and 4 you need all elements that these elementals are consist of to be in your combinations.(via DICE RUSH). This is where worn rings(upcoming mechanic) will become really valuable.
13. Once deployed into the battle - we simulate a battle by each elemental attacking the opponents. The targeting is prioritizing on elements weaknesses(as was initially done in some of the previous iterations)
14. Next turn - all not-destroyed elementals are back into the roster so we can roll again and deploy them again. Destroyed elementals cannot be deployed again in the same battle.
15. Elementals are now have attack and health so we simulate 1 attack from each elemental on 10 step subtracting the HP from elementals and maintaining those values. 
16. Players are also have health. Let's say the default health value - 30. If, for example, you wasn't able to deploy any elemental in current turn - the enemy's elementals will attack players health subtracting respected value. 
17. We are now in no need to limit battle turns into only 3, we can continue the battle until one of the parties player health will be lowered to zero. 

Side Note for next iterations: Need to think of the modifiers on the elementals so that the battles will not be pure simple attacks.

## V3.0 Clarifications (locked)
1. We are moving away from "power" as the combat stat. Battles use `attack` and `health` from elementals.
2. Element weakness bonus remains +10% attack damage:
   - Water -> Fire
   - Fire -> Air
   - Air -> Earth
   - Earth -> Water
   - Lightning is neutral: no passive bonus and no passive weakness.
3. Example for weakness bonus: Fire elemental with attack 10 attacking Air deals 11 damage.
4. Level 3 and 4 deployment requirement is evaluated across the full Dice Rush chain of the turn (not only a single cycle).
5. Deployment rule:
   - If an element is present in set-aside dice (solo or as part of a valid combination), deploy all applicable party elementals of that element.
6. If a player deploys nothing, all enemy deployed elemental attacks go directly to player health.
7. If a player deployed something, enemy attacks target deployed elementals first. Once all deployed defenders are destroyed, remaining attacks overflow to player health.
8. Destroyed elementals persist as destroyed for the whole battle and cannot be deployed again in later turns.
9. Both players roll privately and do not see each other's deployment before combat resolution.
10. Attack ordering and initiative:
   - Combat resolves one-by-one alternating attacks between sides.
   - First attacker selection:
     - If deployed counts differ, the side with fewer deployed elementals attacks first.
     - If deployed counts are equal, first attacker is random.
   - Targeting priority is by elemental weakness exploitation first (as in Phase 1 examples), then fallback to available alive targets.
11. Rewards and penalties are resolved only when the full battle ends (player health reaches zero on one side).

## Wild Encounters update direction
Wild encounters should also become battle-based:
- Player fights the encountered elemental using the same battle flow foundation.
- Once encountered elemental is defeated in battle, player catches it.
