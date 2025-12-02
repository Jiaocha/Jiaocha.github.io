class DocumentPreviewer {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('previewContent');
    this.supportedFormats = {
      'pdf': this.previewPDF.bind(this),
      'doc': this.previewOffice.bind(this),
      'docx': this.previewOffice.bind(this),
      'xls': this.previewOffice.bind(this),
      'xlsx': this.previewOffice.bind(this),
      'ppt': this.previewOffice.bind(this),
      'pptx': this.previewOffice.bind(this),
      'txt': this.previewText.bind(this),
      'md': this.previewMarkdown.bind(this),
      'jpg': this.previewImage.bind(this),
      'jpeg': this.previewImage.bind(this),
      'png': this.previewImage.bind(this),
      'gif': this.previewImage.bind(this),
      'bmp': this.previewImage.bind(this)
    };
  }
  
  async preview(file) {
    const extension = file.ext.toLowerCase();
    
    // 显示加载状态
    this.container.innerHTML = `
      <div class="preview-content-area">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>正在加载 ${file.name}...</p>
        </div>
      </div>
    `;
    
    try {
      // 延迟以显示加载状态
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 根据文件类型选择预览方法
      if (this.supportedFormats[extension]) {
        await this.supportedFormats[extension](file);
      } else {
        this.previewUnsupported(file);
      }
    } catch (error) {
      console.error('预览文件出错:', error);
      this.previewError(file, error.message);
    }
  }
  
  async previewPDF(file) {
    // 使用之前创建的PDF查看器
    const viewerUrl = `/lib/pdf-viewer.html?file=${encodeURIComponent(file.path)}`;
    const width = Math.min(window.innerWidth * 0.9, 1200);
    const height = Math.min(window.innerHeight * 0.9, 800);
    window.open(viewerUrl, '_blank', `width=${width},height=${height},left=100,top=50`);
    
    // 在主预览区域显示提示
    this.container.innerHTML = `
      <div class="preview-content-area">
        <div class="pdf-preview-info">
          <h3>PDF 文档预览</h3>
          <p>PDF 文件将在新窗口中打开进行预览。</p>
          <div class="preview-actions">
            <button class="preview-btn" onclick="window.open('${viewerUrl}', '_blank', 'width=${width},height=${height},left=100,top=50')">在新窗口打开</button>
          </div>
        </div>
      </div>
    `;
  }
  
  async previewOffice(file) {
    // 尝试使用Google Docs Viewer
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(window.location.origin + file.path)}&embedded=true`;
    
    this.container.innerHTML = `
      <div class="preview-content-area">
        <div class="office-preview-container">
          <iframe class="office-preview" src="${googleViewerUrl}" frameborder="0" allowfullscreen></iframe>
          <div class="preview-fallback">
            <p>如果文档未正确显示，您可以:</p>
            <button class="preview-btn" onclick="downloadFile('${file.path}')">直接下载文档</button>
          </div>
        </div>
      </div>
    `;
  }
  
  async previewImage(file) {
    this.container.innerHTML = `
      <div class="preview-content-area">
        <div class="image-preview-container">
          <img class="preview-image" src="${file.path}" alt="${file.name}" onload="this.parentElement.classList.add('loaded')">
          <div class="image-info">
            <span>${file.name}</span>
            <span>${file.size}</span>
          </div>
        </div>
      </div>
    `;
    
    // 添加图片点击放大功能
    setTimeout(() => {
      const img = this.container.querySelector('.preview-image');
      if (img) {
        img.addEventListener('click', function() {
          const zoomImg = document.createElement('div');
          zoomImg.className = 'image-zoom';
          zoomImg.innerHTML = `<img src="${this.src}" alt="${file.name}">`;
          zoomImg.addEventListener('click', function() {
            this.remove();
          });
          document.body.appendChild(zoomImg);
        });
      }
    }, 500);
  }
  
  async previewText(file) {
    try {
      const response = await fetch(file.path);
      const text = await response.text();
      
      // 限制显示的文本长度
      const displayText = text.length > 5000 ? text.substring(0, 5000) + '...' : text;
      
      this.container.innerHTML = `
        <div class="preview-content-area">
          <div class="text-preview-container">
            <div class="text-preview-header">
              <span>${file.name}</span>
              <span class="text-size">${file.size}</span>
            </div>
            <div class="text-content">${this.escapeHTML(displayText).replace(/\n/g, '<br>')}</div>
            ${text.length > 5000 ? '<p class="text-truncated">内容已截断，下载查看完整内容</p>' : ''}
          </div>
        </div>
      `;
    } catch (error) {
      throw new Error('无法加载文本文件: ' + error.message);
    }
  }
  
  async previewMarkdown(file) {
    try {
      const response = await fetch(file.path);
      let markdown = await response.text();
      
      // 简单的Markdown转HTML（实际应用中应使用专业库）
      let html = this.markdownToHTML(markdown);
      
      this.container.innerHTML = `
        <div class="preview-content-area">
          <div class="markdown-preview">
            <div class="markdown-header">
              <span>${file.name}</span>
              <span class="text-size">${file.size}</span>
            </div>
            ${html}
          </div>
        </div>
      `;
    } catch (error) {
      throw new Error('无法加载Markdown文件: ' + error.message);
    }
  }
  
  previewUnsupported(file) {
    this.container.innerHTML = `
      <div class="preview-content-area">
        <div class="unsupported-preview">
          <h3>不支持预览的文件类型</h3>
          <p>文件: ${file.name}</p>
          <p>类型: ${file.ext}</p>
          <p>大小: ${file.size}</p>
          <button class="download-btn" onclick="downloadFile('${file.path}')">下载文件</button>
        </div>
      </div>
    `;
  }
  
  previewError(file, errorMessage) {
    this.container.innerHTML = `
      <div class="preview-content-area">
        <div class="error-preview">
          <h3>预览错误</h3>
          <p>文件: ${file.name}</p>
          <p>错误: ${errorMessage}</p>
          <button class="download-btn" onclick="downloadFile('${file.path}')">下载文件</button>
          <button class="retry-btn" onclick="showFilePreview(${JSON.stringify(file)})">重试</button>
        </div>
      </div>
    `;
  }
  
  // 工具函数
  escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
  
  markdownToHTML(markdown) {
    // 简单的Markdown转HTML，实际应用应使用marked或类似库
    let html = markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/\[(.*)\]\((.*)\)/gim, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n{2,}/g, '<br><br>');
    
    return `<div class="markdown-content">${html}</div>`;
  }
}

// 全局函数
function downloadFile(path) {
  const link = document.createElement('a');
  link.href = path;
  link.download = decodeURIComponent(path.split('/').pop());
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 预览样式
const previewStyles = `
<style>
  .preview-content-area {
    padding: 20px;
    height: calc(100% - 100px);
    overflow: auto;
  }
  
  .loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #3498db;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(52, 152, 219, 0.3);
    border-radius: 50%;
    border-top-color: #3498db;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .office-preview {
    width: 100%;
    height: 600px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .office-preview-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .preview-fallback {
    margin-top: 15px;
    text-align: center;
    color: #7f8c8d;
  }
  
  .preview-btn {
    background: #3498db;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    margin: 5px;
    transition: background 0.3s;
  }
  
  .preview-btn:hover {
    background: #2980b9;
  }
  
  .image-preview-container {
    text-align: center;
    padding: 20px;
  }
  
  .preview-image {
    max-width: 100%;
    max-height: 500px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  .preview-image.loaded {
    opacity: 1;
  }
  
  .image-info {
    margin-top: 15px;
    color: #7f8c8d;
    font-size: 14px;
  }
  
  .image-zoom {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    cursor: pointer;
  }
  
  .image-zoom img {
    max-width: 90%;
    max-height: 90%;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
  }
  
  .text-preview-container {
    background: #f9f9f9;
    border-radius: 4px;
    padding: 20px;
    font-family: monospace;
    font-size: 14px;
    line-height: 1.6;
    max-height: 600px;
    overflow: auto;
    border: 1px solid #eee;
  }
  
  .text-preview-header {
    display: flex;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
    margin-bottom: 15px;
    color: #2c3e50;
  }
  
  .text-content {
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  .text-truncated {
    color: #e74c3c;
    font-style: italic;
    margin-top: 10px;
  }
  
  .markdown-preview {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
  }
  
  .markdown-header {
    display: flex;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
    margin-bottom: 20px;
    color: #2c3e50;
  }
  
  .markdown-content h1, .markdown-content h2, .markdown-content h3 {
    color: #2c3e50;
    margin-top: 24px;
    margin-bottom: 16px;
  }
  
  .markdown-content h1 { font-size: 1.8em; }
  .markdown-content h2 { font-size: 1.5em; }
  .markdown-content h3 { font-size: 1.2em; }
  
  .markdown-content p {
    margin: 16px 0;
  }
  
  .markdown-content a {
    color: #3498db;
    text-decoration: none;
  }
  
  .markdown-content a:hover {
    text-decoration: underline;
  }
  
  .markdown-content ul {
    padding-left: 20px;
    margin: 16px 0;
  }
  
  .markdown-content li {
    margin-bottom: 8px;
  }
  
  .unsupported-preview, .error-preview {
    text-align: center;
    padding: 40px 20px;
    color: #7f8c8d;
  }
  
  .unsupported-preview h3, .error-preview h3 {
    color: #2c3e50;
    margin-bottom: 20px;
  }
  
  .download-btn, .retry-btn {
    padding: 8px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin: 5px;
    transition: all 0.3s;
  }
  
  .download-btn {
    background: #3498db;
    color: white;
  }
  
  .download-btn:hover {
    background: #2980b9;
  }
  
  .retry-btn {
    background: #e74c3c;
    color: white;
  }
  
  .retry-btn:hover {
    background: #c0392b;
  }
  
  .pdf-preview-info {
    text-align: center;
    padding: 40px 20px;
  }
  
  .preview-actions {
    margin-top: 20px;
  }
</style>
`;

// 初始化函数
function initDocumentPreviewer() {
  // 添加预览样式
  if (!document.getElementById('document-preview-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'document-preview-styles';
    styleElement.innerHTML = previewStyles;
    document.head.appendChild(styleElement);
  }
  
  // 创建预览器实例
  window.documentPreviewer = new DocumentPreviewer();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initDocumentPreviewer);