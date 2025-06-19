"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInbox,
  faSearch,
  faSignOutAlt,
  faBars,
  faRobot,
  faPen,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { autoRefreshToken } from "@/utils/auth";

type Props = {
  onCompose: () => void;
  setSearchContent: (query: string) => void;
  setIsClassify: (isClassify: boolean) => void;
};

export function SidebarGuest({
  onCompose,
  setSearchContent,
  setIsClassify,
}: Props) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const truncate = (str: string, maxLength: number) => {
    return str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
  };

  // Load thông tin user từ localStorage
  const loadUserInfo = () => {
    setUserName(localStorage.getItem("userName") || "Guest");
    const guestId = localStorage.getItem("guestId") || "Unknown";
    setUserEmail(truncate(guestId, 10));
  };

  useEffect(() => {
    loadUserInfo();

    // Cập nhật khi localStorage thay đổi (như sau login)
    window.addEventListener("storage", loadUserInfo);

    return () => {
      window.removeEventListener("storage", loadUserInfo);
    };
  }, []);

  const handleSearch = () => {
    setSearchContent(searchQuery);
  };

  return (
    <>
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded shadow"
        >
          <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
        </button>
      )}

      <aside
        className={`w-64 h-screen overflow-y-auto border-r border-gray-200 bg-gray-50 flex flex-col px-4 py-6 space-y-6 text-sm text-gray-800 fixed top-0 left-0 z-30 transition-transform duration-300 ${showSidebar ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 md:relative`}
      >
        {/* Nút đóng trên mobile */}
        <div className="md:hidden flex justify-end mb-4">
          <button
            onClick={() => setShowSidebar(false)}
            className="text-gray-500 hover:text-black"
          >
            ×
          </button>
        </div>

        {/* Thông tin người dùng */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-sm">
            G
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">{userName}</span>
            <span className="text-xs text-gray-500">{userEmail}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded bg-gray-100 text-sm placeholder-gray-400"
          />
          <button onClick={handleSearch} className="absolute right-5 top-1.5">
            <FontAwesomeIcon
              icon={faSearch}
              className="w-4 h-4 text-gray-400"
            />
          </button>
        </div>
        <hr className="opacity-10" />
        {/* Soạn thư */}
        <button
          onClick={onCompose}
          className="w-full h-20 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2 px-4 shadow-md rounded-2xl flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faPen} className="w-4 h-4" />
          <span>Soạn thư</span>
        </button>
        {/* Danh mục chính */}
        <div>
          <div className="uppercase text-xs text-gray-400 mb-1">Hộp thư</div>
          <SidebarItem icon={faInbox} label="Toàn bộ thư" href="/guest/inbox" />
        </div>

        {/* Công cụ */}
        <div>
          <div className="uppercase text-xs text-gray-400 mb-1 mt-4">
            Công cụ
          </div>
          <SidebarItem
            icon={faRobot}
            label="Phân loại tự động"
            onClick={() => {
              alert("Đăng nhập để sử dụng chức năng này");

            }}
          />
        </div>

        {/* Đăng xuất */}
        <div className="mt-auto">
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/";
            }}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 text-sm text-gray-800 w-full"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarItem({
  icon,
  label,
  href,
  badge,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  href?: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const classes = `flex items-center justify-between px-2 py-1 rounded hover:bg-gray-100 ${active ? "bg-gray-100 font-semibold" : ""
    }`;

  const content = (
    <div className="flex items-center gap-2">
      <FontAwesomeIcon icon={icon} className="w-4 h-4" />
      <span>{label}</span>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={classes + " w-full text-left"}>
        {content}
        {badge && <span className="text-xs text-gray-500">{badge}</span>}
      </button>
    );
  }

  return (
    <Link href={href || "#"}>
      <div className={classes}>
        {content}
        {badge && <span className="text-xs text-gray-500">{badge}</span>}
      </div>
    </Link>
  );
}
