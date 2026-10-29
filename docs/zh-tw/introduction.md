Developer Handbook

# Perxona Connect Kit

Build a browser-native avatar experience.

**Perxona Connect API** 與
`<sv-presenter>` Avatar Web Component
的公開整合介面。本手冊先說明這兩個契約；後半部的 Express
範例則展示其中一種實作方式。

## 什麼是 Perxona Connect Kit？

Connect Kit 是將即時 3D Avatar 加入網頁產品的公開整合介面。它將
瀏覽器的渲染契約與伺服器端的 Connect API 分開，因此可依照自己的
應用程式架構使用兩者。

💡

**術語說明：**本文中的「虛擬人」與技術文件、UI 和
API 中的 `Avatar` 指的是同一個角色資源。為了與
Avatar 下拉選單、API 欄位及程式碼保持一致，這些技術名稱會維持
英文 `Avatar`。

它由兩個互補的部分組成：

- **`<sv-presenter>`** —
  在瀏覽器中 渲染 Avatar 的 Web Component，負責初始化指定的
  Avatar／Scene／Voice，並執行語音、動作與口型同步播放。
- **Connect API** — 提供 catalog asset、voice、
  presentation 與 chatbot 的驗證 HTTP 端點。以
  **Connect API 金鑰**驗證，透過
  `X-Connect-Key` header 送出。金鑰分兩種：**secret**
  留在你的伺服器，**publishable**
  才是交給瀏覽器的那把——它能讀取 catalog、產生
  presentation、發放語音 token，除此之外沒有更多。
