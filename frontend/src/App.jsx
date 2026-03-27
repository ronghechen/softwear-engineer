import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import GalleryPage from "./pages/GalleryPage";
import UploadPage from "./pages/UploadPage";
import SearchBar from "./components/SearchBar";

function NavBar() {
  const location = useLocation();

  return (
    <nav className="top-nav">
      <div className="top-nav-search">
        {location.pathname === "/" && <SearchBar />}
      </div>

      <div className="nav-links">
        <Link
          to="/"
          className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
        >
          Gallery
        </Link>
        <Link
          to="/upload"
          className={`nav-link ${location.pathname === "/upload" ? "active" : ""}`}
        >
          Upload
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/upload" element={<UploadPage />} />
      </Routes>
    </BrowserRouter>
  );
}