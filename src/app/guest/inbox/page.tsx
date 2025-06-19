"use client";

import { useState, useEffect } from "react";
import { SidebarGuest } from "@/components/SidebarGuest";
import EmailDetailModal from "@/components/EmailDetailModal";
import ComposeEmailModal from "@/components/ComposeEmailModal";
import Swal from "sweetalert2";
import {
  getGuestEmails,
  syncEmails,
  searchEmails,
  classifyEmails,
  createGuestSession,
  isGuestMode,
  createGuestEmail,
  deleteGuestEmail,
  getGuestEmailDetail,
} from "@/services/api";

type Email = {
  id: string;
  subject: string;
  sender: string;
  recipient: string;
  snippet: string;
  content?: string;
  date: string;
  isRead: boolean;
  labels: string[];
  direction: "DRAFT";
  prediction?: {
    label: string;
    probability: number;
    prediction: number;
    confidenceLevel: string;
    flags: {
      urgentKeywords?: string[];
      suspiciousUrls?: string[];
    };
  };
};

const InboxPage = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchContent, setSearchContent] = useState("");
  const [isEmailDetailOpen, setIsEmailDetailOpen] = useState(false);
  const [isClassify, setIsClassify] = useState(false);
  const [isGuestSession, setIsGuestSession] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Initialize guest session if needed
  useEffect(() => {
    const initializeSession = async () => {
      const guestMode = isGuestMode();
      setIsGuestSession(guestMode);

      if (
        !localStorage.getItem("jwtToken") &&
        !localStorage.getItem("guestId")
      ) {
        try {
          await createGuestSession();
          setIsGuestSession(true);
        } catch (error) {
          console.error("Failed to create guest session:", error);
        }
      }
    };

    initializeSession();
  }, []);

  const fetchEmails = async (page = 1) => {
    try {
      const response = await getGuestEmails({
        pageindex: page,
        pagesize: pageSize,
        labelname: "",
      });

      const mappedEmails = response.map((item: any) => ({
        id: item.emailId,
        subject: item.subject || "(Không có tiêu đề)",
        sender: item.from || item.fromAddress || "Không rõ người gửi",
        snippet: item.snippet || "(Không có nội dung)",
        content:
          item.body ||
          item.details?.body ||
          item.snippet ||
          "(No content available)",
        date:
          item.saveDate ||
          item.sentDate ||
          item.receivedDate ||
          new Date().toISOString(),
        isRead: true,
        labels: item.labelName ? [item.labelName] : ["UNDEFINE"],
      }));

      if (page === 1) {
        setEmails(mappedEmails);
      } else {
        setEmails((prev) => [...prev, ...mappedEmails]);
      }

      if (mappedEmails.length < pageSize) setHasMore(false);
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    }
  };

  const loadMoreEmails = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    setIsLoadingMore(true);
    fetchEmails(nextPage).finally(() => setIsLoadingMore(false));
  };

  useEffect(() => {
    // Only sync emails for authenticated users, not guests
    if (!isGuestMode()) {
      syncEmails().then(() => fetchEmails(1));
    } else {
      fetchEmails(1);
    }
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchContent.trim() === "") return;

      // Search is only available for authenticated users
      if (isGuestMode()) {
        // For guests, filter locally
        const filtered = emails.filter(
          (email) =>
            email.subject.toLowerCase().includes(searchContent.toLowerCase()) ||
            email.sender.toLowerCase().includes(searchContent.toLowerCase()) ||
            email.snippet.toLowerCase().includes(searchContent.toLowerCase())
        );
        setEmails(filtered);
        return;
      }

      try {
        const response = await searchEmails(1, pageSize, searchContent);
        const mappedEmails = response.map((item: any) => ({
          id: item.emailId,
          subject: item.subject || "(Không có tiêu đề)",
          sender: item.fromAddress || "Không rõ người gửi",
          snippet: item.snippet || "(Không có nội dung)",
          content:
            item.body ||
            item.details?.body ||
            item.snippet ||
            "(No content available)",
          date: item.sentDate || item.receivedDate || new Date().toISOString(),
          isRead: true,
          labels: item.labelName ? [item.labelName] : ["Chưa gắn nhãn"],
        }));
        setEmails(mappedEmails);
        setHasMore(false);
      } catch (error) {
        console.error("Lỗi tìm kiếm email:", error);
      }
    };

    fetchSearchResults();
  }, [searchContent]);

  useEffect(() => {
    if (isClassify && !isGuestMode()) {
      const classify = async () => {
        try {
          const result = await classifyEmails();
          console.log("Kết quả phân loại:", result);
          fetchEmails(1);
        } catch (error) {
          console.error("Lỗi phân loại email:", error);
          Swal.fire({
            icon: "error",
            title: "Lỗi phân loại",
            text: "Không thể phân loại email. Vui lòng thử lại sau.",
          });
        }
      };
      classify();
      setIsClassify(false);
    }
  }, [isClassify]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenEmailModal = () => {
    setIsEmailDetailOpen(true);
  };

  const handleEmailClick = async (emailId: string) => {
    try {
      const detail = await getGuestEmailDetail(emailId.trim());

      const email: Email = {
        id: detail.emailId,
        subject: detail.subject || "(Không có tiêu đề)",
        sender: detail.from || detail.fromAddress || "Không rõ người gửi",
        recipient: detail.to || detail.toAddress || "Không rõ người nhận",
        snippet: detail.snippet || "",
        content: detail.body || "(Không có nội dung)",
        date:
          detail.saveDate ||
          detail.sentDate ||
          detail.receivedDate ||
          new Date().toISOString(),
        isRead: true,
        labels: [detail.labelName || "Chưa gắn nhãn"],
        direction: detail.directionName || "RECEIVED",
        prediction: detail.details
          ? {
            label: detail.details.label,
            probability: detail.details.probability,
            prediction: detail.details.prediction,
            confidenceLevel: detail.details.confidenceLevel,
            flags: detail.details.details?.flags || {},
          }
          : undefined,
      };

      setSelectedEmail((prev) => ({
        ...prev,
        ...email,
      }));
    } catch (error) {
      console.error("Lỗi lấy nội dung email:", error);
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    try {
      await deleteGuestEmail(emailId);
      setEmails((prev) => prev.filter((email) => email.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error("Lỗi xóa email:", error);
      alert("Không thể xóa email. Vui lòng thử lại sau.");
    }
  };

  const handleComposeEmail = () => {
    fetchEmails(1); // Refresh the email list
  };

  const [isLoadingClassify, setIsLoadingClassify] = useState(false);

  const handleClassifyClick = async () => {
    if (isGuestMode()) {
      alert("Tính năng phân loại chỉ dành cho người dùng đã đăng nhập.");
      return;
    }

    setIsLoadingClassify(true);
    const classifyPromise = classifyEmails().catch((error) => {
      console.error("Phân loại lỗi", error);
    });
    await Promise.all([
      classifyPromise,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    setIsLoadingClassify(false);
  };

  const [isLoadingSync, setIsLoadingSync] = useState(false);

  const handleSyncClick = async () => {
    if (isGuestMode()) {
      alert("Tính năng đồng bộ chỉ dành cho người dùng đã đăng nhập.");
      return;
    }

    setIsLoadingSync(true);
    const syncPromise = syncEmails().catch((error) => {
      console.error("Đồng bộ lỗi", error);
    });
    await Promise.all([
      syncPromise,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    setIsLoadingSync(false);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 text-gray-800">
      <div className="sticky top-0 h-screen">
        <SidebarGuest
          onCompose={handleOpenEmailModal}
          setSearchContent={setSearchContent}
          setIsClassify={setIsClassify}
        />
      </div>
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {isGuestSession && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <strong>Chế độ khách:</strong> Dữ liệu của bạn sẽ được lưu tối đa 3
            ngày.
            <a href="/login" className="underline ml-2">
              Đăng nhập
            </a>{" "}
            để sử dụng đầy đủ tính năng.
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClassifyClick}
            disabled={isGuestSession}
            className={`relative flex items-center gap-2 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 ${isGuestSession
                ? "text-gray-400 bg-gray-200 cursor-not-allowed"
                : "text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
              }`}
          >
            {isLoadingClassify && (
              <svg
                className="animate-spin h-4 w-4 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
            )}
            {isLoadingClassify ? "Đang phân loại..." : "Phân loại toàn bộ"}
          </button>

          <button
            type="button"
            onClick={handleSyncClick}
            disabled={isGuestSession}
            className={`relative flex items-center gap-2 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 ${isGuestSession
                ? "text-gray-400 bg-gray-200 cursor-not-allowed"
                : "text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
              }`}
          >
            {isLoadingSync && (
              <svg
                className="animate-spin h-4 w-4 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
            )}
            {isLoadingSync ? "Đang đồng bộ..." : "Đồng bộ email"}
          </button>
        </div>

        {emails.map((email) => (
          <div
            key={email.id}
            className="border border-gray-300 rounded-md p-4 shadow-sm bg-white flex gap-4 items-start"
          >
            <div className="flex-1">
              <button onClick={() => handleEmailClick(email.id)}>
                <h3 className="text-lg font-semibold text-blue-700 hover:underline text-left">
                  {email.subject}
                </h3>
              </button>
              <p className="text-sm text-gray-500 mb-1">Từ: {email.sender}</p>
              <div
                className="text-sm text-gray-700"
                dangerouslySetInnerHTML={{
                  __html: email.content || email.snippet,
                }}
              />
              <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
                <span>{new Date(email.date).toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  {email.labels.map((label, index) => {
                    const map: Record<string, [string, string]> = {
                      NORMAL: ["bg-green-100", "text-green-700"],
                      UNDEFINE: ["bg-gray-100", "text-gray-700"],
                      SPAM: ["bg-yellow-100", "text-yellow-700"],
                      PHISHING: ["bg-red-100", "text-red-700"],
                    };
                    const [bgColor, textColor] = map[label.toUpperCase()] || [
                      "bg-blue-100",
                      "text-blue-700",
                    ];

                    return (
                      <span
                        key={index}
                        className={`${bgColor} ${textColor} px-2 py-0.5 rounded mr-1 text-sm pt-1`}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDeleteEmail(email.id)}
              className="text-red-500 hover:text-red-700 p-1"
              title="Xóa email"
            >
              🗑️
            </button>
          </div>
        ))}

        {hasMore && (
          <div className="text-center">
            <button
              onClick={loadMoreEmails}
              disabled={isLoadingMore}
              className="px-4 py-2 text-white bg-blue-500 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              {isLoadingMore ? "Đang tải..." : "Tải thêm"}
            </button>
          </div>
        )}
      </div>

      {selectedEmail && (
        <EmailDetailModal
          email={{
            ...selectedEmail,
            content: selectedEmail?.content || "",
            onDelete: () => handleDeleteEmail(selectedEmail.id),
            isGuest: isGuestSession,
          }}
          onClose={() => setSelectedEmail(null)}

          markAsUnread={(id: string) => {
            setEmails((prevEmails) =>
              prevEmails.map((email) =>
                email.id === id ? { ...email, isRead: false } : email
              )
            );
          }}
          isGuest={isGuestSession}
        />
      )}

      {isEmailDetailOpen && (
        <ComposeEmailModal
          onClose={() => setIsEmailDetailOpen(false)}
          onCompose={handleComposeEmail}
          isGuest={isGuestSession}
        />
      )}
    </div>
  );
};

export default InboxPage;
