# KB_Sere_Stroke
来自小红书的一点点震撼，文科生+Vibe Coding＞科班生的作品，一个Markdown笔记编辑器
## 环境准备
安装 Node.js
index.html、style.css、script.js放在同一目录
## 初始化npm
`npm init -y`
## 安装依赖
`npm install electron --save-dev`
`npm install electron-builder --save-dev`
## 配置主进程
在项目根目录创建 main.js，内容如下：
const { app, BrowserWindow } = require('electron');
const path = require('path');
app.disableHardwareAcceleration();
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // ✅ 这一行：去掉顶部窗口栏
    transparent: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
打开 package.json，替换原有内容为以下配置：
{
  "name": "kubi",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "devDependencies": {
    "electron": "^30.0.0",
    "electron-builder": "^24.13.3"
  },
  "build": {
    "appId": "com.kubi.app",
    "productName": "枯笔",
    "win": {
      "icon": "icon.ico",
      "target": "zip",
      "signAndEditExecutable": false
    }
  }
}
## 打包应用
npm run build
