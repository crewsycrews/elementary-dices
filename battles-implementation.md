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