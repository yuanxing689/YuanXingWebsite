import './theme.css'
import Layout from './Layout.vue'
import Tabber from './components/Tabber.vue'
import {
  installHistoryTraversalCapture
} from '../../../src/app/navigation/historyTraversalCapture.js'

export default {
  Layout,
  enhanceApp({ app }) {
    app.component('Tabber', Tabber)
  }
}

if (typeof window !== 'undefined') {
  installHistoryTraversalCapture()
}