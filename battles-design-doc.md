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
Players took turns throwing dice one by one until every player had thrown 3 dice. This is the main part of a gameplay. The gamehook of the game. Player should choose an appropriate dice to straighten he's elementals based on the dice affinity. Example: let's continue with the same parties I mentioned on phase 1. I'm the first player, I see that my F elementals are weak in this stack so I'm deciding to throw dice with fire affinity(it's d4 right now). Results that I could get is the next: 
  1. Critical success: Add maximum bonus multiplier from dice stats to all **fire** elementals power in the battle
  2. Success: Add half of bonus multiplier from dice stats to all **fire** elementals power in the battle
  3. Fail: Add half of bonus multiplier from dice stats to all **water** elementals power in the battle
  4. Critical fail: Add maximum bonus multiplier from dice stats to all **water** elementals power in the battle
The only tricky dice is the lightning one. When there's any "success" throw - we simply amplify lightning elementals on the battlefield following the same rules above. But once it's fail - we start to amplify ALL other elements in the battle by quarter of bonus multiplier. Crit fail - half of the bonus multiplier. 
Again these power changes as well as thrown dice should be reflected in the UI after each turn. 

### Phase 3
Battle resolution. Once all the multipliers are applied we sum up power of each elemental and calculate Total party power number. Which one is bigger is the winner party.


# Battles implementation V2.0
## Dice
We are changing dice to a new faces. Instead of numbers we'll start to use elemental signs on them - 🌊, 🔥, 💨, ⛰️, ⚡.
We still want to have same notations maintained so the distribution will be like this:
- d20 - basically flat 5 + 5 + 5 + 5. So we simply repeat each element 4 times. The better quality dice will be the 1 that is including 1 and then 2 elements repeated more then 4 times(5-6). 
- d12 - Again it's 5 + 5 and then 11 and 12 can be any other element. This dice will always be of 1 rarity since the advantage will be varying depending on the player's setup
- d10 - flat 5 + 5. Second tier rarity dice can have 1 of the element to be repeated thrice(and not more).
- d6 - 5 + 1 that can be any element. Rarity is always the same. 
- d4 - All 4 is a different combination of 5 elements. Rarity is always the same. 

## Battle rules
These rules are highly developed on top of Farkle - classic dice game where you throw 6 dice and trying to achieve as high score as possible. Here we are doing the same, but player is trying to roll for a specific element as well.
Battle turn:
0. Choose 1 element that can be "set aside"(see 3.) no matter if it was in the combination or not. This element's dice will solely give elementals 10% bonus.
1. At the beginning of each turn, the player throws all **five** dice at once.
2. After first throw, player can choose to reroll **ONCE** from 1 to 5 dice to achieve some combination
3. One or more dice combination should be set aside. 
4. The player may then either end their turn or roll again the least dice(only after "set aside" action).
5. Combinations that already set aside can be regrouped with rethrown ones.
6. If all 5 dice are participating in a combination - it's a DICE RASH - The player can throw all 5 dice again to accumulate even more bonuses. (start from 1 step saving current bonuses)
7. If no combination in the roll - and you already rerolled once(2 step) - you lose all the bonuses.

Bonuses are applied only to your elementals!

## Dice combinations
- Triplet - 3 dice are showing the same element. +30% to power
- Quartet - 4 dice are showing the same element. +40%
- All-For-One - 5 dice are showing the same element. +50%
- One-For-All - All 5 dice are different from each other - +30% to a chosen element. 
- Full House - Triplet + 2 dice of the same but different from triplet element. +25% for 2 and + 35% for 3 to a respective element.

# Battles implementation V3.0

In this iteration we are trying to add some mechanics from Hearthstone battlegrounds on top of farkle. With the previous implementation our [[#Elements effects on each other]] was removed due to no attacks between the elementals. Now we want them back. 
## Battle updated rules:
1. Choose 1 element that can be set aside no matter if it was in the combination or not. This element element's die will solely give elementals 10% bonus.
2. At the beginning of each turn, the player throws all five dice at once.
3. After the very first throw, player can choose to re-roll from 1 to 5 dice to achieve some combination
4. One or more dice combination can be set aside. 
5. The player may then either end their turn or roll again the least dice(only after "set aside" action).
6. Combinations that already set aside can be regrouped with re-throwned ones.
7. If all 5 dice are participating in a combination - it's a DICE RASH - The player can throw all 5 dice again to accumulate even more bonuses. (start from 1 step saving current bonuses)
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

# Battles implementation V4.0

Previous version is really stupid in practice. 
EVOLVING AGAIN!

No choosing an element in the beginning of the battle. We are now capable of set aside any dice after the roll. Reroll capability should be removed. And we are not only setting them aside, but also we assign the dice to some of our elementals.(Drag-n-Drop) Once assigned - elemental is deployed to the battle. We are still rolling for results the remaining dice trying to get the combinations. Targeting is the same. The only difference is that combinations will now add different bonuses based on the element thrown with the combination and we also want to introduce a 2-die combination(Doublet). 

Water based combinations: heal the assigned elementals for the amount of their attack. 
  - Doublet - attack x1, 
  - Triplet - attack x1.5
  - Quartet - attack x2
  - Quintet - attack x3
Earth: Adds armor to assigned elementals for the whole battle (max dmg reduce 50%)
  - Doublet - reduce 5% of dmg
  - Triplet - reduce 10% of dmg
  - Quartet - reduce 15% of dmg
  - Quintet - reduce 20% of dmg
Fire: Increases damage for the whole battle with the same percentage amount like it was before(+20%, +30%, +40%, +50%)
  - Doublet - +20%
  - Triplet - +30%
  - Quartet - +40%
  - Quintet - +50%
Wind: Adds dodge possibility for the whole battle.(max cap - 40%)
  - Doublet - +5%
  - Triplet - +8%
  - Quartet - +12%
  - Quintet - +15%
Lightning: Add a chance for the double attack(max cap - 40%)
  - Doublet - +5%
  - Triplet - +8%
  - Quartet - +12%
  - Quintet - +15%

One-For-All combination is now giving each Doublet bonus from every element to every assigned elemental. 

Full House is just the combination of Doublet + Triplet. No specific improvements.

## V4.0 Clarifications (locked)
1. Deployment and assignment:
   - One elemental can be assigned only one die per turn.
   - Assignment is the only way to deploy.
   - A die that is assigned cannot be rolled again in the same turn.
2. Combination scope:
   - Combination detection uses all set-aside dice in the turn state, including assigned and unassigned set-aside dice.
3. Commit timing:
   - All combination effects are applied only on commit, immediately before combat resolution starts.
4. Combat mechanics:
   - Armor damage reduction is applied after all damage multipliers.
   - Dodge fully negates the incoming hit.
   - Lightning double attack does not retarget. If the first hit kills the target, the second hit is lost.
5. Full House:
   - Full House gives only the Doublet + Triplet effects implied by its two parts, no extra unique effect.
6. Hidden information:
   - Opponent deployment remains hidden until combat is resolved.
7. Turn end requirement:
   - The strict requirement for ending turn is to deploy all possible elementals.
   - Dice assignment is element-agnostic: a die can be assigned to any eligible elemental regardless of rolled element.
   - "Possible" means any alive, not-yet-destroyed party elemental that can still receive an assignment this turn under assignment-slot constraints.
   - Example: two fire elementals can both be deployed using non-fire rolled faces (for example earth and air), if assignment slots are available.
8. Single-die bonuses:
   - Singular set-aside/assigned elemental dice provide a small bonus.
   - If a matching combination bonus exists for that elemental in the same turn, the combination bonus overwrites the single-die bonus (no stacking).
   - Values:
     - Water: heal assigned elemental for 0.5x attack
     - Earth: +3% damage reduction
     - Fire: +10% damage
     - Air: +3% dodge
     - Lightning: +3% double attack chance
9. Naming:
   - Continue using established naming in code/contracts (`air`), not `wind`.

## V4.0 Implementation Plan (codebase-aligned)
1. Shared contracts first:
   - Update `shared/src/schemas.ts` Farkle/Battle DTOs for V4 turn flow.
   - Add assignment fields on dice state (`is_set_aside`, `is_assigned`, `assigned_to_party_index`).
   - Replace reroll-specific fields (`has_used_reroll`, `set_aside_element_bonus`) with assignment/deployment validation state.
2. Event DTOs and API boundaries:
   - Update `server/modules/events/models.ts` DTOs to expose V4 actions and result payloads.
   - Keep payloads deterministic enough for reconnect and UI replay.
3. Server battle engine split:
   - Add pure V4 logic module (new file) next to existing battle/farkle logic:
     - roll remaining dice
     - detect combinations including Doublet
     - enforce assignment limits and deploy-all-possible rule
     - compute commit-time bonuses with non-stacking override
   - Add V4 combat resolver module for dodge/armor/double-attack behavior.
4. Orchestration integration in `EventService`:
   - Refactor V3 flow in `server/modules/events/service.ts` from reroll pipeline to V4 pipeline:
     - roll
     - set aside
     - assign/unassign
     - commit
   - Preserve hidden opponent deployment behavior.
5. Battle/wild endpoints:
   - Update route modules:
     - `server/modules/battles/index.ts`
     - `server/modules/wild-encounters/index.ts`
   - Replace/remove reroll-oriented actions with assign/commit actions.
6. Persistence alignment:
   - Add a new migration after existing farkle-session migration to align stored session/state columns with V4 needs.
   - Keep rich per-turn details in `events_farkle_state.meta`.
7. Client store and composables:
   - Update:
     - `client/src/stores/event.ts`
     - `client/src/composables/useBattle.ts`
   - Remove choose-element/reroll assumptions and add assignment/commit validity.
8. Battle UI updates:
   - Update `client/src/views/BattleView.vue` and relevant game components for drag-and-drop die assignment and deployment status.
   - Surface:
     - set-aside vs assigned dice
     - mandatory undeployed elementals
     - final commit summary before combat.
9. Validation and balancing:
   - Add focused unit tests for new pure logic modules (combination detection, non-stacking override, deploy-all-possible gate, combat edge cases).
   - Add combat log details needed for balancing and debugging.
