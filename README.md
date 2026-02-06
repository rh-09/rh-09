👋 Hi, This is Rakib Hasan here. Studying 
Electrical and Electronic Engineering at 
Khulna University of Engineering and Technology. 

## Night Ops FPS Demo

### How to play
1. Start a local server from the repo root (required for ES modules):
   ```bash
   python -m http.server 8000
   ```
2. Open `http://127.0.0.1:8000/` in a modern desktop browser.
3. Click **Deploy** to enter the simulation and lock your pointer.

### Controls
- **W/A/S/D**: Move
- **Shift**: Sprint (drains stamina)
- **C**: Crouch
- **Space**: Jump
- **Mouse**: Aim
- **Left click**: Fire
- **R**: Reload
- **V**: Toggle visor overlay
- **F**: Focus (aim-down-sight with FOV tighten)

### Objective
- Shoot the glowing targets to earn score.
- Avoid drones that damage you when they get close.
- Keep an eye on the HUD for health, stamina, focus, ammo, and time.
