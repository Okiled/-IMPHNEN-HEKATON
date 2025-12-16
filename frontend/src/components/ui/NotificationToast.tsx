"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, TrendingUp, Bell, Flame } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

interface Notification {
  id: string;
  type: "burst" | "info" | "success" | "warning";
  title: string;
  message: string;
  productName?: string;
  burstLevel?: string;
  timestamp: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  addNotification: () => {},
  removeNotification: () => {},
  clearAll: () => {},
});

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, "id" | "timestamp">) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 5));

    // auto remove setelah 8 detik
    setTimeout(() => {
      removeNotification(id);
    }, 8000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();
  const { theme } = useTheme();

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="pointer-events-auto"
          >
            <NotificationCard 
              notification={notification} 
              onClose={() => removeNotification(notification.id)}
              theme={theme}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotificationCard({ 
  notification, 
  onClose,
  theme 
}: { 
  notification: Notification; 
  onClose: () => void;
  theme: "light" | "dark";
}) {
  const getIcon = () => {
    switch (notification.type) {
      case "burst":
        return notification.burstLevel === "CRITICAL" 
          ? <Flame className="w-5 h-5 text-red-500 animate-pulse" />
          : <TrendingUp className="w-5 h-5 text-orange-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "success":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgStyle = () => {
    if (theme === "dark") {
      switch (notification.type) {
        case "burst":
          return notification.burstLevel === "CRITICAL"
            ? "bg-red-900/90 border-red-700"
            : "bg-orange-900/90 border-orange-700";
        case "warning":
          return "bg-yellow-900/90 border-yellow-700";
        case "success":
          return "bg-green-900/90 border-green-700";
        default:
          return "bg-gray-800/95 border-gray-700";
      }
    } else {
      switch (notification.type) {
        case "burst":
          return notification.burstLevel === "CRITICAL"
            ? "bg-red-50 border-red-300"
            : "bg-orange-50 border-orange-300";
        case "warning":
          return "bg-yellow-50 border-yellow-300";
        case "success":
          return "bg-green-50 border-green-300";
        default:
          return "bg-white border-gray-200";
      }
    }
  };

  return (
    <div className={`relative p-4 rounded-xl border shadow-lg backdrop-blur-sm ${getBgStyle()}`}>
      {notification.type === "burst" && notification.burstLevel === "CRITICAL" && (
        <div className="absolute inset-0 rounded-xl bg-red-500/10 animate-pulse pointer-events-none" />
      )}
      
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          theme === "dark" ? "bg-gray-800/50" : "bg-white/50"
        }`}>
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-bold text-sm ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              {notification.title}
            </h4>
            {notification.burstLevel && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                notification.burstLevel === "CRITICAL"
                  ? "bg-red-500 text-white"
                  : notification.burstLevel === "HIGH"
                  ? "bg-orange-500 text-white"
                  : "bg-yellow-500 text-gray-900"
              }`}>
                {notification.burstLevel}
              </span>
            )}
          </div>
          
          <p className={`text-sm ${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}>
            {notification.message}
          </p>
          
          {notification.productName && (
            <p className={`text-xs mt-1 font-medium ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}>
              Produk: {notification.productName}
            </p>
          )}
        </div>
        
        <button
          onClick={onClose}
          className={`p-1 rounded-lg transition-colors ${
            theme === "dark" 
              ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200" 
              : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden">
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 8, ease: "linear" }}
          className={`h-full ${
            notification.type === "burst" 
              ? "bg-red-500" 
              : notification.type === "warning"
              ? "bg-yellow-500"
              : notification.type === "success"
              ? "bg-green-500"
              : "bg-blue-500"
          }`}
        />
      </div>
    </div>
  );
}
