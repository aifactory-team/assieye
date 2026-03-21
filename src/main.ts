import '@/styles/base.css';
import '@/styles/panels.css';
import '@/styles/map.css';
import '@/styles/themes.css';
import { App } from '@/App';

const app = new App('app');
app.init().catch((err) => {
  console.error('Failed to initialize AssiEye:', err);
});
