# The upgrade graph

The owner's design (drawn 23 Oct, settled in this file): every tab is bought now, at a suggested price, so every
upgrade has a parent, and what shows follows the graph (the rules below).

How it reads: an arrow points from what an upgrade needs to the upgrade. **max** on an arrow: that parent maxed. **5+**:
five levels of it. A label on a tab's arrow is a condition besides the price.

## The tabs

| Tab | Price | Needs | And |
|---|---|---|---|
| Workshop | 100 m | nothing: the first buy | |
| Autopilot | 500 m | Workshop | 2 km+ driven |
| Black market | 1 point | Workshop | P100 |
| Fleet | 1 point | Black market | P1 |
| War Rig | 1 scrap | Fleet | totalled a car |

## The graph

```mermaid
flowchart TD
  subgraph W["Workshop · 100 m"]
    workshop(["Workshop tab"])
    power["Power"]
    rev["Rev limit"]
    gears["Gearbox"]
    tyres["Tyres"]
    time["Time"]
    steering["Steering"]
    stereo["Car stereo"]
    flash["Headlight flash"]
    v8["Muscle V8"]
    i6["JDM Turbo I6"]
    recharge["Flash recharge"]
  end
  subgraph A["Autopilot · 500 m"]
    autopilot(["Autopilot tab"])
    clutch["Auto clutch"]
    gas["Auto gas"]
    steer["Lane assist"]
    autoflash["Auto flash"]
    shift["Auto shift"]
    cruise["Autocruise"]
  end
  subgraph B["Black market · 1 point"]
    black(["Black market tab"])
    grid["Bribe the starter"]
    rolling["Jump the start"]
    reckless["Reckless driving"]
    chicken["Game of chicken"]
    ecuRev["ECU: rev limit"]
    ecuPower["ECU: power"]
    cooling["Cooling"]
    nitro["Nitro"]
    daredevil["Daredevil"]
    gear7["7th gear"]
    rcruise["Reckless auto-drive"]
  end
  subgraph F["Fleet · 1 point"]
    fleetTab(["Fleet tab"])
    converter["Mile converter"]
    payoff["Pay off a racer"]
    dues["Fleet dues"]
    pace["Fleet tuning"]
    fleetFlash["Fleet flash"]
  end
  subgraph R["War Rig · 1 scrap"]
    warrig(["War Rig tab"])
    bullbar["Bull bar"]
    madness["Fuel madness"]
    armour["Armour plating"]
    spikes["Spiked hubs"]
    guns["Guns"]
    autogun["Auto gun"]
    radio["War Rig radio"]
    hunter["Hunter"]
    pack["Hunting pack"]
  end

  workshop --> power & rev & gears & tyres & time & steering & stereo & flash
  power --> v8
  rev --> v8
  gears --> v8
  power -- max --> i6
  rev -- max --> i6
  gears -- max --> i6
  v8 --> i6
  flash -- "5+" --> recharge
  reckless --> recharge

  workshop -- "2 km+ driven" --> autopilot
  autopilot --> clutch & gas & steer & autoflash
  flash -- "5+" --> autoflash
  clutch --> shift
  steer & shift & gas --> cruise

  workshop -- "P100" --> black
  black --> grid & reckless & rcruise
  grid --> rolling
  reckless --> chicken & ecuRev
  recharge --> chicken
  ecuRev --> ecuPower
  ecuPower --> cooling & nitro
  nitro -- max --> daredevil
  nitro --> gear7
  gears -- max --> gear7
  cruise --> rcruise
  gear7 --> rcruise

  black -- P1 --> fleetTab
  fleetTab --> converter & payoff
  payoff --> dues & pace & fleetFlash
  flash -- "5+" --> fleetFlash

  fleetTab -- "totalled a car" --> warrig
  warrig --> bullbar & armour & spikes & radio & hunter
  bullbar --> madness
  spikes --> guns
  guns --> autogun
  stereo --> radio
  cruise --> hunter
  rcruise --> hunter
  hunter --> pack
  dues & pace & fleetFlash --> pack
```

## The rules

1. **Bought is unlocked.** A tab or a card stays out of sight until one of its parents is bought. An arrow with a
   count (**max**, **5+**) counts once the count is met: 7th gear shows once its tab is bought and the Gearbox maxed.
2. **To buy it, all its parents**, counts and conditions included.
3. **Story conditions hide**: a tab waiting on one (P100, P1, a car totalled) stays out of sight until it is met and
   its parent bought. Any other condition (2 km driven) is part of its rule, in sight.
4. **In sight and locked**, a card shows its name and its whole rule, what is done ticked. A parent still out of sight
   shows as ???: Flash recharge's in act I (Reckless driving) is a teaser, the owner's call.
5. **A tab is bought by tapping it** in the tab row, where it shows with its price once in sight.
6. **Free cards** (the Mile converter) follow the same rules, with no price.
7. **Saves**: a tab counts as bought once any upgrade on it is owned, so players keep their pages.
8. **Scrap** is the War Rig's money (it was parts), in the save too.

## The chain

Each upgrade and what it needs, one line each: the list to edit.

### Workshop (100 m; needs nothing)

- Power ← Workshop
- Rev limit ← Workshop
- Gearbox ← Workshop
- Tyres ← Workshop
- Time ← Workshop
- Steering ← Workshop
- Car stereo ← Workshop
- Headlight flash ← Workshop
- Muscle V8 ← Power, Rev limit, Gearbox
- JDM Turbo I6 ← Muscle V8, Power max, Rev limit max, Gearbox max
- Flash recharge ← Headlight flash 5+, Reckless driving

### Autopilot (500 m; needs the Workshop, and 2 km+ driven)

- Auto clutch ← Autopilot
- Auto gas ← Autopilot
- Lane assist ← Autopilot
- Auto flash ← Autopilot, Headlight flash 5+
- Auto shift ← Auto clutch
- Autocruise ← Lane assist, Auto shift, Auto gas

### Black market (1 point; needs the Workshop, and reaching P100)

- Bribe the starter ← Black market
- Jump the start ← Bribe the starter
- Reckless driving ← Black market
- Game of chicken ← Reckless driving, Flash recharge
- ECU: rev limit ← Reckless driving
- ECU: power ← ECU: rev limit
- Cooling ← ECU: power
- Nitro ← ECU: power
- Daredevil ← Nitro max
- 7th gear ← Nitro, Gearbox max
- Reckless auto-drive ← Black market, Autocruise, 7th gear

### Fleet (1 point; needs the Black Market, and reaching P1)

- Mile converter ← Fleet (free)
- Pay off a racer ← Fleet
- Fleet dues ← Pay off a racer
- Fleet tuning ← Pay off a racer
- Fleet flash ← Pay off a racer, Headlight flash 5+

### War Rig (1 scrap; needs the Fleet, and a car totalled)

- Bull bar ← War Rig
- Fuel madness ← Bull bar
- Armour plating ← War Rig
- Spiked hubs ← War Rig
- Guns ← Spiked hubs
- Auto gun ← Guns
- War Rig radio ← War Rig, Car stereo
- Hunter ← War Rig, Autocruise, Reckless auto-drive
- Hunting pack ← Hunter, Fleet dues, Fleet tuning, Fleet flash

## The Crew page (decided 26 Oct, to build)

Act 3 is being rebuilt as the crew (design notes: Act 3 redesign). The Fleet becomes the Crew: the tab, the page and
the cards renamed, the ids kept for the saves. Until its layers land, the graph above is the game as built; each layer
moves its part into it.

The tab: **Crew** (the Fleet renamed), 1 point, needs the Black market, and P1, as before. The War Rig needs the Crew.

```mermaid
flowchart TD
  subgraph C["Crew · 1 point"]
    crewTab(["Crew tab"])
    converter["Fuel converter"]
    payoff["Pay off a racer"]
    tuning["Crew tuning"]
    racing["Racing"]
    harvesting["Harvesting"]
    brewing["Brewing"]
    crude["Crude tank"]
    sonar["Sonar range"]
    scouting["Scouting"]
    foreman["Foreman"]
  end
  black(["Black market tab"]) -- P1 --> crewTab
  crewTab --> converter & payoff
  payoff --> tuning
  crewTab -- "the first crude" --> racing & harvesting
  crewTab -- "the first fuel" --> brewing
  harvesting --> crude & sonar
  sonar --> scouting
  scouting -- max --> foreman
  sonar -- max --> foreman
```

- Fuel converter ← Crew (free; the Mile converter renamed)
- Pay off a racer ← Crew
- Crew tuning ← Pay off a racer (Fleet tuning renamed)
- Racing ← Crew, the first crude (Fleet dues renamed)
- Harvesting ← Crew, the first crude
- Brewing ← Crew, the first fuel
- Crude tank ← Harvesting
- Sonar range ← Harvesting
- Scouting ← Sonar range
- Foreman ← Scouting max, Sonar range max

**The first crude** and **the first fuel** come in the scripted run after the 5th car (the oil puddle, then the
refinery). They are story conditions, and on a card they hide as a tab's do (rule 3): no role or role upgrade is named
before the run that brings it.

**Goes:** Fleet flash (it never fired at P1), team places' miles (they pay points), miles (fuel, one for one). **To
settle with act 4's layer:** the Hunting pack becomes the Hunter role, and what it needs now that Fleet flash is gone.

## What changed (23 Oct), against the game before

- **The tabs are bought**: the Workshop and the Autopilot were open from the start, the Black market opened with the
  reveal, the Fleet at P1, the War Rig with the first car totalled.
- **Muscle V8** needs Power, Rev limit and Gearbox bought; it was 4,000 m with nothing before it.
- **JDM Turbo I6** needs the V8, and Power, Rev limit and Gearbox maxed; it was 10,000 m after the V8.
- **Flash recharge** needs 5 flashes and Reckless driving; it needed 10, and was on sale only after the reveal.
- **Game of chicken** needs Flash recharge; it needed Headlight flash.
- **The ECU** is a chain: ECU: rev limit, then ECU: power, then Cooling and Nitro; the first three needed only Reckless
  driving.
- **Jump the start** needs Bribe the starter; it was on sale with the Black market.
- **Reckless auto-drive** needs the Black market, Autocruise and 7th gear; it needed Autocruise, Reckless driving, and
  7th gear bought.
- **Daredevil** needs Nitro maxed; it needed everything else maxed.
- **The Fleet** needs the Black market, and the **War Rig** the Fleet.
- **Mile converter**: the Exchange card (metres for miles), free, under the Fleet tab.
- **Fuel madness** needs Bull bar; it needed nothing.
- **Hunter** needs the War Rig, Autocruise and Reckless auto-drive; it needed Autocruise.
- **Hunting pack** needs Hunter, Fleet dues, Fleet tuning and Fleet flash; it needed nothing.
- **Scrap** replaces parts, the War Rig's money.
- **Team places** (the Fleet, not an upgrade): at the finish each fleet car's place pays miles, a tenth of a mile for
  each ten places from the back (the act to 51 cars in 10–12 races; it took 14–16).
