import React, {createContext, useContext, useState} from 'react';
import { LuChevronFirst, LuChevronLast } from "react-icons/lu";
import { MdAlternateEmail, MdCampaign } from "react-icons/md";
import { IoCloudUploadOutline } from "react-icons/io5";
import { TiContacts } from "react-icons/ti";
import { FaInbox } from "react-icons/fa";
import { NavLink } from 'react-router-dom'; // Import for routing

const SidebarContext = createContext()
const Sidebar = () => {
    const [expanded, setExpanded] = useState(true);
  return (
    <aside className='h-screen sticky top-0'>
      <nav className='h-full flex flex-col bg-white border-r shadow-sm'>
        <div className="p-4 pb-2 flex justify-between items-center">
          <img src="vite.svg" alt="vite" className={`overflow-hidden transition-all ${expanded ? "w-10": "w-0"}`}/>
          <button className='p-1.5 rounded-lg bg-gray-50' onClick={() => setExpanded(curr => !curr)}>
            {expanded ? <LuChevronFirst size={20}/> : <LuChevronLast size={20}/>}
          </button>
        </div>
        <SidebarContext.Provider value={{expanded}}>
            <ul className='flex-1 px-3'>
                <SidebarItem icon={<MdAlternateEmail size={20} />} text="SMTPs" to="/smtp" />
                <SidebarItem icon={<MdCampaign size={20} />} text="Campaigns" to="/campaigns" />
                <SidebarItem icon={<IoCloudUploadOutline size={20} />} text="Upload" to="/upload-recipients" />
                <SidebarItem icon={<TiContacts size={20} />} text="Recipients" to="/recipients" />
                <SidebarItem icon={<FaInbox size={20} />} text="Unibox" to="/unibox" />
            </ul>

        </SidebarContext.Provider>
      </nav>
    </aside>
  );
};

export default Sidebar;

export function SidebarItem({ icon, text, to }) {
    const {expanded} = useContext(SidebarContext);
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          `relative flex items-center py-2 px-3 my-1 font-medium rounded-md transition-colors group ${
            isActive
              ? "bg-gradient-to-tr from-indigo-200 to-indigo-100 text-indigo-800"
              : "hover:bg-indigo-50 text-gray-600"
          }`
        }
      >
        {icon}
        <span className={`overflow-hidden transition-all ${expanded ? "w-32 ml-3": "w-0"}`}>{text}</span>
        {!expanded && (
            <div className={`absolute left-full rounded-md px-2 py-1 ml-6 bg-indigo-200 text-sm invisible opacity-20 -transalate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:transalate-x-0`}>
                {text}
            </div>
        )}
      </NavLink>
    </li>
  );
}
