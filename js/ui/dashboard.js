import { GyroscopeManager } from '../sensors/gyro.js';
import { MotionManager } from '../sensors/motion.js';

const gyro = new GyroscopeManager();
const motion = new MotionManager();

export async function initDashboard(){

  gyro.start();
  motion.start();

  const app = document.getElementById('app');

  setInterval(() => {

    const g = gyro.getData();
    const m = motion.get();

    app.innerHTML = `

      <div class="grid grid-cols-3 gap-6">

        <div class="card">
          <h2>Gyroscope</h2>

          <p>${g.alpha}</p>
          <p>${g.beta}</p>
          <p>${g.gamma}</p>
        </div>

        <div class="card">
          <h2>Motion</h2>

          <p>${m.x}</p>
          <p>${m.y}</p>
          <p>${m.z}</p>
        </div>

      </div>

    `;

  },100);

}