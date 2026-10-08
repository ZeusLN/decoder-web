import { Route, Routes } from 'react-router';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Decode from './pages/Decode';
import Verify from './pages/Verify';
import NotFound from './pages/NotFound';

export default function App() {
    return (
        <div className="app-shell">
            <Nav />
            <main style={{ flex: 1 }}>
                <Routes>
                    <Route path="/" element={<Decode />} />
                    <Route path="/verify" element={<Verify />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}
