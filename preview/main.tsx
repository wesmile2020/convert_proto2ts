import { createRoot } from 'react-dom/client';
import './setup';
import App from './App';
import './index.css';

const root = document.getElementById('app')!;

createRoot(root).render(<App />);
