import { Outlet } from "react-router-dom";

import Header from "../components/Header/Header";
import "./UserLayout.css";

export default function UserLayout() {
  return (
    <div className="user-layout">
      <Header />
      <main className="user-main">
        <Outlet />
      </main>
    </div>
  );
}
