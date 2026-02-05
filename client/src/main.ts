// ES style import from Excalibur
import { Actor, Color, Engine, Scene } from "excalibur";
import { api } from "@elementary-dices/shared/api";

const game = new Engine({
  width: 800,
  height: 600,
});
api.api
  .get()
  .then((response) => {
    console.log("API Response:", response);
  })
  .catch((error) => {
    console.error("API Error:", error);
    throw error;
  });
// Create a simple scene
const scene = new Scene();

// Add a simple rectangle actor as a test
const actor = new Actor({
  x: 400,
  y: 300,
  width: 50,
  height: 50,
  color: Color.Blue,
});

scene.add(actor);
game.addScene("main", scene);
game.goToScene("main");

game.start();

console.log("🎮 Elementary Dices game started!");
