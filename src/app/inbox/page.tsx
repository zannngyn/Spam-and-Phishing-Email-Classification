"use client";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import EmailDetailModal from "@/components/EmailDetailModal";
import { Star } from "lucide-react";
import ComposeEmailModal from "@/components/ComposeEmailModal";
import React from "react";
import Swal from "sweetalert2";
import {
    getEmails as getEmailsOriginal,
    getEmailDetail,
    syncEmails,
    searchEmails,
    classifyEmails,
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
    direction: "SENT" | "RECEIVED" | "DRAFT";
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

const Page = () => {
    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [searchContent, setSearchContent] = useState("");
    const [isEmailDetailOpen, setIsEmailDetailOpen] = useState(false);
    const [isClassify, setIsClassify] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const fetchEmails = async (page = 1) => {
        try {
            const response = await getEmailsOriginal({
                pageindex: page,
                pagesize: pageSize,
                labelname: "",
                directionname: "INBOX",
            });

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
        syncEmails().then(() => fetchEmails(1));
    }, []);

    useEffect(() => {
        const fetchSearchResults = async () => {
            if (searchContent.trim() === "") return;
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
            const detail = await getEmailDetail(emailId.trim());

            const email: Email = {
                id: detail.emailId,
                subject: detail.subject || "(Không có tiêu đề)",
                sender: detail.fromAddress || "Không rõ người gửi",
                recipient: detail.toAddress || "Không rõ người nhận",
                snippet: detail.snippet || "",
                content: detail.body || "(Không có nội dung)",
                date:
                    detail.sentDate || detail.receivedDate || new Date().toISOString(),
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

    const [isLoadingClassify, setIsLoadingClassify] = useState(false);

    const handleClassifyClick = async () => {
        Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Đang phân loại email...",
            showConfirmButton: false,
            timer: 1500,
        });
    };

    const handleSyncClick = async () => {
        Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Đang đồng bộ email...",
            showConfirmButton: false,
            timer: 1500,
        });
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 text-gray-800">
            <div className="sticky top-0 h-screen">
                <Sidebar
                    onCompose={handleOpenEmailModal}
                    setSearchContent={setSearchContent}
                    setIsClassify={setIsClassify}
                />
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                <div className="flex">
                    <button
                        type="button"
                        onClick={handleClassifyClick}
                        className="relative flex items-center gap-2 text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
                    >
                        Phân loại email
                    </button>

                    <button
                        type="button"
                        onClick={handleSyncClick}
                        className="relative flex items-center gap-2 text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
                    >
                        Đồng bộ email
                    </button>
                </div>

                {emails.map((email) => (
                    <div
                        key={email.id}
                        className="border border-gray-300 rounded-md p-4 shadow-sm bg-white flex gap-4 items-start"
                    >
                        <div className="flex-1">
                            <button onClick={() => handleEmailClick(email.id)}>
                                <h3 className="text-lg font-semibold text-blue-700 hover:underline">
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
                                {email.labels.map((label, index) => {
                                    const map = {
                                        NORMAL: ["bg-green-100", "text-green-700"],
                                        UNDEFINE: ["bg-gray-100", "text-gray-700"],
                                        SPAM: ["bg-yellow-100", "text-yellow-700"],
                                        PHISHING: ["bg-red-100", "text-red-700"],
                                    };
                                    const [bgColor, textColor] = map[label.toUpperCase() as keyof typeof map] || [
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
                        <button onClick={() => console.log("Starred")}>...</button>
                    </div>
                ))}

                {hasMore && (
                    <div className="text-center">
                        <button
                            onClick={loadMoreEmails}
                            disabled={isLoadingMore}
                            className="px-4 py-2 text-black bg-gray-400 opacity-50 hover:bg-blue-700 rounded"
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
                        isGuest: false,
                        onDelete: (id: string) => {
                            setEmails((prevEmails) =>
                                prevEmails.filter((email) => email.id !== id)
                            );
                        },
                    }}
                    isGuest={false}
                    onClose={() => setSelectedEmail(null)}
                    markAsUnread={(id: string) => {
                        setEmails((prevEmails) =>
                            prevEmails.map((email) =>
                                email.id === id ? { ...email, isRead: false } : email
                            )
                        );
                    }}
                />
            )}

            {isEmailDetailOpen && (
                <ComposeEmailModal
                    onClose={() => setIsEmailDetailOpen(false)}
                    onCompose={() => console.log("Compose email")}
                />
            )}
        </div>
    );
};

export default Page;
