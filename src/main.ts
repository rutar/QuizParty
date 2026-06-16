import './components/quiz-app';
import './style.css';

const root = document.querySelector('#app');
if (root) {
  root.replaceChildren(document.createElement('quiz-app'));
}