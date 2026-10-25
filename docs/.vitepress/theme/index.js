import './theme.css'
import Layout from './Layout.vue'
import {
  installHistoryTraversalCapture
} from '../../../src/app/navigation/historyTraversalCapture.js'

export default { Layout }

if (typeof window !== 'undefined') {
  installHistoryTraversalCapture()
}
