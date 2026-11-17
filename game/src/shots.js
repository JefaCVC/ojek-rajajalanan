// Screenshot staging: each named scene puts the real game into a state worth
// photographing, using the same systems the player uses — no fake UI, no edited
// pixels. The scenes run through the normal update loop for a few seconds so
// traffic settles, then set window.__shotReady for the capture script.

/** Moves traffic cars out of the way of a staged ride, so the bike is not
 *  stopped by a random car before the picture is taken: anything near the
 *  start, and anything on the same road ahead of the rider. */
function clearPath(game, x, y) {
  for (const car of game.traffic.cars) {
    const nearStart = Math.hypot(car.x - x, car.y - y) < 900;
    const onRoadAhead = Math.abs(car.y - y) < 60 && car.x > x;
    if (nearStart || onRoadAhead) {
      car.x = 3000 + Math.random() * 400;
      car.y = 200 + Math.random() * 400;
    }
  }
}

export function stageScene(game, name) {
  const player = game.player;
  const city = game.city;
  const pangkalan = city.landmarks.pangkalan;
  const market = city.landmarks.market;
  const dealer = city.landmarks.dealer;

  game.ui.setScreen('playing');
  game.day.setHour(16.5);
  game.day.setWeather('cerah');

  if (name === 'cover') {
    // Riding east through the centre with an active order, traffic around,
    // police closing in. The east run is the longest straight road, so the
    // bike is at speed when the picture is taken.
    game.garage.buy('sport-150');
    game.garage.select('sport-150');
    player.setPosition(400, 1350);
    player.setAngle(0);
    player.boardBike('sport-150');
    player.addMoney(400000);
    game.orders.refreshBoard(game.day.shift, ['kota-lama', 'pusat', 'timur', 'selatan'], 1, 4.8, 5);
    const order = game.orders.board.find((o) => !o.story && o.type === 'penumpang')
      || game.orders.board.find((o) => !o.story)
      || game.orders.board[0];
    if (order) {
      game.orders.accept(order.id);
      game.orders.markPickedUp();
    }
    game.police.addWanted(2);
    for (let i = 0; i < 2; i += 1) {
      game.police.cars.push({
        x: 400 - 140 - i * 80,
        y: 1350 + (i === 0 ? -30 : 40),
        angle: 0, speed: 500, siren: i,
      });
    }
    clearPath(game, 400, 1350);
    game.traffic.setWaving(4);
    game.input.simulatePress('KeyW');
  } else if (name === 'foot') {
    // On foot at the market, among pedestrians and food carts.
    player.setPosition(market.x + 40, market.y + 30);
    player.dismount();
    game.orders.refreshBoard(game.day.shift, ['kota-lama', 'pusat'], 1, 4.2, 2);
    game.traffic.setWaving(5);
  } else if (name === 'dealer') {
    // The dealer open, money high enough to buy, the Sport 150 in reach.
    player.setPosition(dealer.x, dealer.y + 120);
    player.boardBike('bebek-tua');
    player.addMoney(3000000);
    game.ui.setScreen('dealer');
    game.ui.setDealerTab('bikes');
  } else if (name === 'chase') {
    // Wanted four stars, police cars close behind, the Moge at full speed
    // down the long east road.
    game.garage.buy('moge-250');
    game.garage.select('moge-250');
    player.setPosition(400, 1050);
    player.setAngle(0);
    player.boardBike('moge-250');
    player.addMoney(500000);
    game.police.addWanted(4);
    for (let i = 0; i < 3; i += 1) {
      game.police.cars.push({
        x: 400 - 110 - i * 80,
        y: 1050 + (i - 1) * 40,
        angle: 0, speed: 500, siren: i,
      });
    }
    clearPath(game, 400, 1050);
    game.input.simulatePress('KeyW');
  }

  // Let the scene settle for two seconds of simulation, then signal readiness.
  setTimeout(() => {
    window.__shotReady = true;
  }, 2000);
}
