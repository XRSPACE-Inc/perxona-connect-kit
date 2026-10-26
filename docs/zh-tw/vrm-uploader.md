## VRM Uploader

Perxona Connect Kit 讓你用一支 script 自己把
**VRM** 角色加進 Avatar
目錄，不需要額外架設任何基礎設施。無論你想為產品打造品牌吉祥物、為受眾建立專屬的數位主持人，或是為個人專案製作原創角色，這都是從
`.vrm` 檔案到上線說話 Avatar 的最快路徑。

⏸️

**暫停上傳：**請先不要上傳 VRM。上傳的 VRM 會成為
Three.js Avatar，而 Connect 目前還沒有提供這類
Avatar：預設情況下 Avatar 目錄不會回傳它，`<sv-presenter>`
的 Three.js renderer
也尚未釋出。上傳本身會成功，但之後你無法列出、選取或顯示這個角色。在這則提醒移除之前，`upload-vrm.sh`
請只搭配
`--validate-only`
使用；檢查功能不受影響，你仍然可以先把檔案準備好。本章節其餘內容說明的是重新開放後的上傳方式。

🪆

上傳的 Avatar 僅對你的 Perxona
組織帳號可見。同組織的成員在上傳完成後即可立即在 Connect Kit
Avatar 下拉選單中選取——無需重新部署。

⚠️

**封測提醒：**Connect Kit
目前仍處於封測階段。今日上傳的 VRM
角色預計將於一個月後失效，且不再維護；Perxona
保留移除這些角色的權利。未來 Connect Kit
版本更新後，才會維護新上傳的 VRM 檔案。

### 上傳你的 VRM

`upload-vrm.sh`
會照這一頁寫的每一條檢查你的檔案，通過就直接幫你上傳。它需要
`bash`、`jq`、`curl`，以及一把
**secret** 類型的 Connect API 金鑰——見[取得 API 憑證](https://connect.perxona.ai/#credentials)。只有 secret 金鑰能上傳素材。

1. #### 取得 script

   ```bash
   curl -fsSLO https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/tools/vrm-uploader/upload-vrm.sh
   chmod +x upload-vrm.sh
   ```
2. #### 檢查檔案

   ```bash
   ./upload-vrm.sh --validate-only my-avatar.vrm
   ```

   每一項檢查各印一行。標成
   `FAIL`
   的就不會上傳。唯一只會提示、不會擋的那一項是表情資料——沒有表情資料的模型一樣載得進來、也能做動作。
3. #### 上傳

   **目前暫停**——請見本章節開頭的提醒。在該提醒移除之前，請不要執行這個步驟。

   ```bash
   export PERXONA_CONNECT_SECRET_KEY=pxc_...
   ./upload-vrm.sh --skeleton-type female my-avatar.vrm
   ```

   不特別指定的話，script 會打
   `https://console.perxona.ai/asia`。不在這一區的話，請先 export
   `PERXONA_API_BASE_URL` 指向你自己的 base
   URL——某一區發出的金鑰在另一區不被接受，而且拒絕訊息不會提到「區域」兩個字。

   `--skeleton-type`
   是選這隻 Avatar
   的動作風格：`male`、`female`、`male_three_head`、`female_three_head`。動作會重定向到你自己的骨架上，所以選錯只是風格不對，不會播不出來。想自訂顯示名稱就加
   `--avatar-name "My Avatar"`；不加就用檔名。

成功後 script 會印出新 Avatar 的 id，這隻角色也會出現在
`GET /assets/avatars`
的 Avatar 清單中，可以直接用在你的作品裡。

🤖

**用 AI 開發助手嗎？**兩個指令都可以加
`--json`，script 就會印出單一 JSON
物件而不是報告，每項檢查各帶一個
`pass`/`warn`/`fail`。結束碼是固定的：`0`
通過、`1` 用法錯或缺工具、缺金鑰、`2`
沒通過檢查、`3` 上傳失敗。丟這樣一句給它就夠了：*「去 Connect Kit repo 下載 upload-vrm.sh，對我的 .vrm 跑
--validate-only --json，告訴我上傳前要修什麼。」*

### 支援的 VRM 規格

請先用這份清單核對你的檔案——每一條都能在 VRoid Studio、Blender
這類常見工具裡自行確認，不需要任何 Perxona 的工具。

- **這份清單是照 VRM 1.0 寫的。**VRM 0.x
  的檔案一樣可以上傳——上傳工具會回報它讀到哪一版，而不是拒絕——但下面每一條都是以
  1.0 為準，所以匯出時（例如從 VRoid Studio）能選就選 VRM 1.0。
- **檔案大小上限 50 MB。**
- **Humanoid 骨架，15 根必要骨齊全**：`hips`、`spine`、`head`，加上左右兩側的大腿／小腿／腳掌與上臂／前臂／手掌。其他
  humanoid 骨骼（胸、頸、肩、手指等）可以不填，但填了就要符合
  VRM 1.0 的骨骼階層。骨骼*命名*不限——我們讀的是 VRM 的
  humanoid 對應表，不是節點名稱，任何 DCC 匯出的命名都可以。
- **建議使用 MToon 材質。**非 MToon
  材質仍可載入，但會退回基本的 unlit / PBR，外觀可能和你在 DCC
  裡看到的不同。角色使用內建光照渲染——VRM
  檔案裡的光源設定不會生效。

🧹

**請只匯出角色本身。**輸出 VRM 1.0
檔案時，請特別注意只保留角色本身。場景、背景、道具、相機、光源、內嵌動畫等內容，我們在轉檔時會嘗試自動移除，但多餘的內容仍可能造成轉檔驗證失敗，導致無法正常上傳。

💇

**目前沒有搖擺物理。**Spring bone
設定（`VRMC_springBone`）不會被模擬——頭髮、裙擺、飾品不會擺動。

### 對嘴與表情

沒有表情資料的模型仍然能載入、能做動作，但不會對嘴、也不會有表情。
請至少準備以下其中一種：

- **VRM 1.0 表情 preset**（VRoid Studio
  匯出時預設就有）：嘴型
  `aa`、`ih`、`ou`、`ee`、
  `oh`；情緒 `happy`、`angry`、
  `sad`、`relaxed`、`surprised`；加上
  `neutral`、眨眼與視線 preset。
- **ARKit-52 blendshape**：morph target 用標準
  ARKit 名稱命名（例如
  `jawOpen`、`eyeBlinkLeft`）。建議用標準名稱，但
  `Face.jawOpen`
  這類帶前綴的寫法也認得——比對時不分大小寫、忽略前後空白，先找完全相同的，再找包含的。

🚧

**表情驅動尚未開放。**目前渲染 Connect
上傳模型的引擎還不會播放對嘴與臉部表情。先備妥上面的表情資料，功能開放時你的模型就能直接使用；缺少表情資料的模型一樣能載入、能做動作。

想深入了解 VRM 格式本身？請參考
[VRM 1.0 官方文件](https://vrm.dev/en/vrm1/)，也有
[中文社群整理的說明](https://docs.vrcd.org.cn/books/vrm-vrm/page/vrm-10#bkmrk-vrm-1.0-%E4%BB%8B%E7%BB%8D%E2%80%8B)。

### 參考範例：ViviPod42

不確定合格的檔案長什麼樣？我們實際驗證過
**ViviPod42**——由 **softmind**（vTuber
ホームセンター）免費提供的模型：VRM 1.0、完整 humanoid 骨架、18
個表情 preset 全齊、20 個材質中 19 個是 MToon。可以到作者的
[BOOTH 頁面](https://booth.pm/en/items/5447425)
下載，和自己的檔案對照。

©️

**ViviPod42 不是 Perxona 的資產。**它由原作者免費提供，僅供規格參考。依檔案內嵌的授權：禁止再散布、禁止修改、僅限個人非商業用途、使用需標註作者。這也是我們只提供作者頁面連結、不自行放檔案的原因。請只在本機用它對照規格——上傳到
Connect 或用在你的作品裡都構成再散布，請不要這麼做。

### 去哪裡找 VRM 檔案

- 到
  [BOOTH](https://booth.pm/en/)
  找 VRM 模型——很多商品還是 VRM
  0.x，下載前請先確認版本與授權條款。
- 或用免費的
  [VRoid Studio](https://vroid.com/en/studio)
  自己做一隻，匯出時選 VRM 1.0。

### 有疑問或上傳失敗？

不確定自己的檔案符不符合規格，或上傳失敗？把檔案資訊和錯誤訊息貼到我們的
[Discord 頻道](https://discord.com/channels/1509062382432026624/1514521511028068374)，我們會協助你處理。還沒加入我們的 Discord 伺服器？請先用
[邀請連結](https://discord.gg/dywx2nJRE)
加入——上面的頻道連結只有成員才打得開。
