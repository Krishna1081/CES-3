// components/layouts/MainLayout.jsx
import Sidebar from "../common/Sidebar";

const MainLayout = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="p-6 flex-1">{children}</div>
    </div>
  );
};

export default MainLayout;
