// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Send,
  History,
  TrendingUp,
  Package,
  Circle,
  Copy,
} from "lucide-react";

const App = () => {
  const [currentDate, setCurrentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reports, setReports] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [nhapKhiList, setNhapKhiList] = useState([]);
  const [currentNhapKhi, setCurrentNhapKhi] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    nhapTaiQuay: "",
    tonHomQua: "",
    tonHomNay: "",
    doiHomNay: "",
    tang: "",
    voBinhHomNay: "",
    binhDoHomNay: "",
    binhTonHomQua: "",
    nhapKhi: "",
  });

  // Load từ storage khi khởi động
  useEffect(() => {
    loadReports();
    loadLastInventory();
  }, []);

  const loadReports = async () => {
    try {
      const result = await window.storage.list("report:");
      if (result && result.keys) {
        const allReports = [];
        for (const key of result.keys) {
          const data = await window.storage.get(key);
          if (data) {
            allReports.push(JSON.parse(data.value));
          }
        }
        allReports.sort((a, b) => new Date(b.date) - new Date(a.date));
        setReports(allReports);
      }
    } catch (error) {
      console.log("Chưa có báo cáo nào");
    }
  };

  const loadLastInventory = async () => {
    try {
      const result = await window.storage.get("last-inventory");
      if (result) {
        const data = JSON.parse(result.value);
        setFormData((prev) => ({
          ...prev,
          tonHomQua: data.tonHomNay || "",
          binhTonHomQua: data.binhTonHomNay || "",
        }));
      }
    } catch (error) {
      console.log("Không có dữ liệu tồn kho trước đó");
    }
  };

  const getTotalNhapKhi = () => {
    return nhapKhiList.reduce((sum, val) => sum + val, 0);
  };

  // Tính toán tự động
  const calculateReport = () => {
    const nhapTaiQuay = parseFloat(formData.nhapTaiQuay) || 0;
    const tonHomQua = parseFloat(formData.tonHomQua) || 0;
    const tonHomNay = parseFloat(formData.tonHomNay) || 0;
    const doiHomNay = parseFloat(formData.doiHomNay) || 0;
    const tang = parseFloat(formData.tang) || 0;
    const voBinhHomNay = parseFloat(formData.voBinhHomNay) || 0;
    const binhDoHomNay = parseFloat(formData.binhDoHomNay) || 0;
    const binhTonHomQua = parseFloat(formData.binhTonHomQua) || 0;
    const nhapKhi = getTotalNhapKhi(); // Dùng tổng từ list

    const xacNhap = nhapTaiQuay + tonHomQua;
    const xacBan = xacNhap - tonHomNay - doiHomNay;
    const binhMoi = voBinhHomNay + binhDoHomNay - binhTonHomQua;

    return {
      xacNhap,
      xacBan,
      xacTon: tonHomNay,
      xacDoi: doiHomNay,
      tang,
      binhMoi,
      nhapKhi,
    };
  };

  const calculated = calculateReport();

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddNhapKhi = () => {
    const value = parseFloat(currentNhapKhi);
    if (value && value > 0) {
      setNhapKhiList([...nhapKhiList, value]);
      setCurrentNhapKhi("");
    }
  };

  const handleRemoveNhapKhi = (index) => {
    const newList = nhapKhiList.filter((_, i) => i !== index);
    setNhapKhiList(newList);
  };

  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const generateTelegramMessage = () => {
    const date = formatDate(currentDate);
    return `-----BC ${date}-----
Ngày ${date}
Xác nhập: ${calculated.xacNhap}
Xác bán: ${calculated.xacBan}
Xác tồn: ${calculated.xacTon}
Xác đổi: ${calculated.xacDoi}
Tặng: ${calculated.tang}
Bình mới: ${calculated.binhMoi}
Nhập khí: ${calculated.nhapKhi.toFixed(1)}`;
  };

  const saveReport = () => {
    const report = {
      date: currentDate,
      formData: { ...formData },
      calculated: { ...calculated },
      message: generateTelegramMessage(),
      timestamp: new Date().toISOString(),
    };

    try {
      // Lưu báo cáo vào danh sách
      const saved = localStorage.getItem("gas-reports");
      const allReports = saved ? JSON.parse(saved) : [];

      // Kiểm tra xem đã có báo cáo ngày này chưa
      const existingIndex = allReports.findIndex((r) => r.date === currentDate);
      if (existingIndex >= 0) {
        allReports[existingIndex] = report;
      } else {
        allReports.push(report);
      }

      localStorage.setItem("gas-reports", JSON.stringify(allReports));

      // Lưu tồn kho
      localStorage.setItem(
        "last-inventory",
        JSON.stringify({
          tonHomNay: formData.tonHomNay,
          binhTonHomNay: formData.tonHomNay,
        })
      );

      loadReports();
      return true;
    } catch (error) {
      console.error("Lỗi khi lưu:", error);
      return false;
    }
  };

  // FUNCTION MỚI: Gửi vào Telegram
  const handleSendToTelegram = async () => {
    if (!formData.nhapTaiQuay || !formData.tonHomNay) {
      alert("Vui lòng nhập đầy đủ thông tin cần thiết!");
      return;
    }

    // Lưu báo cáo trước
    const saved = await saveReport();
    if (!saved) {
      alert("❌ Không thể lưu báo cáo!");
      return;
    }

    // Copy báo cáo
    const message = generateTelegramMessage();
    try {
      await navigator.clipboard.writeText(message);
      alert("✅ Báo cáo đã được lưu!\n\n📋 Nội dung đã copy vào clipboard!");
    } catch (error) {
      alert("✅ Báo cáo đã được lưu!");
    }

    // Reset form for next day
    setFormData({
      nhapTaiQuay: "",
      tonHomQua: formData.tonHomNay,
      tonHomNay: "",
      doiHomNay: "",
      tang: "",
      voBinhHomNay: "",
      binhDoHomNay: "",
      binhTonHomQua: formData.tonHomNay,
      nhapKhi: "",
    });

    // Reset nhập khí
    setNhapKhiList([]);
    setCurrentNhapKhi("");
  };

  const getMonthlyStats = () => {
    if (!selectedMonth) return null;

    const monthReports = reports.filter((r) =>
      r.date.startsWith(selectedMonth)
    );
    if (monthReports.length === 0) return null;

    const totalBan = monthReports.reduce(
      (sum, r) => sum + r.calculated.xacBan,
      0
    );
    const totalNhap = monthReports.reduce(
      (sum, r) => sum + r.calculated.xacNhap,
      0
    );
    const totalBinhMoi = monthReports.reduce(
      (sum, r) => sum + r.calculated.binhMoi,
      0
    );
    const totalNhapKhi = monthReports.reduce(
      (sum, r) => sum + r.calculated.nhapKhi,
      0
    );

    return {
      soNgay: monthReports.length,
      totalBan,
      totalNhap,
      totalBinhMoi,
      totalNhapKhi,
      trungBinhBan: Math.round(totalBan / monthReports.length),
    };
  };

  const monthlyStats = getMonthlyStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Circle className="w-10 h-10 text-blue-400" />
            <h1 className="text-3xl font-bold">Báo cáo Bóng Gas</h1>
          </div>
          <p className="text-blue-300">Quản lý nhanh chóng & chính xác</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setShowHistory(false)}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              !showHistory
                ? "bg-blue-600 shadow-lg shadow-blue-500/50"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            <Package className="w-5 h-5 inline mr-2" />
            Nhập báo cáo
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              showHistory
                ? "bg-blue-600 shadow-lg shadow-blue-500/50"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            <History className="w-5 h-5 inline mr-2" />
            Lịch sử
          </button>
        </div>

        {!showHistory ? (
          <div className="space-y-6">
            {/* Date Picker */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                <Calendar className="w-4 h-4" />
                Ngày báo cáo
              </label>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="w-full bg-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Form nhập liệu */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-lg mb-3 text-blue-300">
                📊 Thông tin bóng
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300">
                    Nhập tại quầy
                  </label>
                  <input
                    type="number"
                    value={formData.nhapTaiQuay}
                    onChange={(e) =>
                      handleInputChange("nhapTaiQuay", e.target.value)
                    }
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Tồn hôm qua</label>
                  <input
                    type="number"
                    value={formData.tonHomQua}
                    onChange={(e) =>
                      handleInputChange("tonHomQua", e.target.value)
                    }
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">
                    Tồn hôm nay *
                  </label>
                  <input
                    type="number"
                    value={formData.tonHomNay}
                    onChange={(e) =>
                      handleInputChange("tonHomNay", e.target.value)
                    }
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Đổi hôm nay</label>
                  <input
                    type="number"
                    value={formData.doiHomNay}
                    onChange={(e) =>
                      handleInputChange("doiHomNay", e.target.value)
                    }
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Tặng</label>
                  <input
                    type="number"
                    value={formData.tang}
                    onChange={(e) => handleInputChange("tang", e.target.value)}
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <h3 className="font-bold text-lg mb-3 text-blue-300 pt-3">
                🔧 Thông tin bình
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300">
                    Vỏ bình hôm nay
                  </label>
                  <input
                    type="number"
                    value={formData.voBinhHomNay}
                    onChange={(e) =>
                      handleInputChange("voBinhHomNay", e.target.value)
                    }
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">
                    Bình dở hôm nay
                  </label>
                  <input
                    type="number"
                    value={formData.binhDoHomNay}
                    onChange={(e) =>
                      handleInputChange("binhDoHomNay", e.target.value)
                    }
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">
                    Bình tồn hôm qua
                  </label>
                  <input
                    type="number"
                    value={formData.binhTonHomQua}
                    onChange={(e) =>
                      handleInputChange("binhTonHomQua", e.target.value)
                    }
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <h3 className="font-bold text-lg mb-3 text-blue-300 pt-3">
                💨 Nhập khí
              </h3>

              <div className="space-y-3">
                {/* Input thêm số cân mới */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-sm text-slate-300 block mb-1">
                      Thêm số cân (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={currentNhapKhi}
                      onChange={(e) => setCurrentNhapKhi(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddNhapKhi();
                        }
                      }}
                      className="w-full bg-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                      placeholder="Nhập số kg"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddNhapKhi}
                      className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      + Thêm
                    </button>
                  </div>
                </div>

                {/* Danh sách các lần cân */}
                {nhapKhiList.length > 0 && (
                  <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
                    <div className="text-sm text-slate-400 mb-2">
                      Danh sách đã cân:
                    </div>
                    {nhapKhiList.map((value, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-800 rounded px-3 py-2"
                      >
                        <span className="text-white">
                          Lần {index + 1}:{" "}
                          <span className="font-bold text-cyan-400">
                            {value.toFixed(1)} kg
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveNhapKhi(index)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          ✕ Xóa
                        </button>
                      </div>
                    ))}

                    {/* Hiển thị tổng */}
                    <div className="border-t border-slate-700 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-semibold">
                          Tổng cộng:
                        </span>
                        <span className="text-2xl font-bold text-green-400">
                          {getTotalNhapKhi().toFixed(1)} kg
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {nhapKhiList.length === 0 && (
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center text-slate-500 text-sm">
                    Chưa có số liệu cân. Nhập số kg và nhấn "Thêm"
                  </div>
                )}
              </div>
            </div>

            {/* Preview báo cáo */}
            <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur rounded-xl p-5 border border-blue-500/30 relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Xem trước báo cáo
                </h3>
                <button
                  onClick={(e) => {
                    const btn = e.currentTarget;
                    navigator.clipboard
                      .writeText(generateTelegramMessage())
                      .then(() => {
                        const originalHTML = btn.innerHTML;
                        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Đã copy!</span>
          `;
                        btn.classList.add("bg-green-600");
                        setTimeout(() => {
                          btn.innerHTML = originalHTML;
                          btn.classList.remove("bg-green-600");
                        }, 2000);
                      })
                      .catch(() => {
                        alert("❌ Không thể copy. Vui lòng copy thủ công.");
                      });
                  }}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-all text-sm font-semibold hover:scale-105"
                  title="Copy báo cáo"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="text-sm bg-slate-900/50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono">
                {generateTelegramMessage()}
              </pre>
            </div>

            {/* Send Button - ĐÃ SỬA */}
            <button
              onClick={handleSendToTelegram}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-6 h-6" />
              Lưu & Gửi vào Telegram
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Monthly Report */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4">
              <label className="text-sm font-semibold mb-2 block">
                Chọn tháng xem báo cáo
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {monthlyStats && (
              <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur rounded-xl p-5 border border-purple-500/30">
                <h3 className="font-bold text-xl mb-4">
                  📈 Báo cáo tháng {selectedMonth}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-slate-400">Số ngày</div>
                    <div className="text-2xl font-bold">
                      {monthlyStats.soNgay}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-slate-400">TB Bán/ngày</div>
                    <div className="text-2xl font-bold text-green-400">
                      {monthlyStats.trungBinhBan}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-slate-400">Tổng bán</div>
                    <div className="text-xl font-bold text-blue-400">
                      {monthlyStats.totalBan}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-slate-400">Tổng nhập</div>
                    <div className="text-xl font-bold text-purple-400">
                      {monthlyStats.totalNhap}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-slate-400">Bình mới</div>
                    <div className="text-xl font-bold text-yellow-400">
                      {monthlyStats.totalBinhMoi}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-slate-400">Nhập khí (kg)</div>
                    <div className="text-xl font-bold text-cyan-400">
                      {monthlyStats.totalNhapKhi.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Reports */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg">Báo cáo theo ngày</h3>
              {reports.length === 0 ? (
                <div className="bg-slate-800/50 rounded-xl p-8 text-center text-slate-400">
                  Chưa có báo cáo nào
                </div>
              ) : (
                reports.map((report, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/50 backdrop-blur rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-blue-300">
                        {formatDate(report.date)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(report.timestamp).toLocaleTimeString("vi-VN")}
                      </span>
                    </div>
                    <pre className="text-xs bg-slate-900/50 rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                      {report.message}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
