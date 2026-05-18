// 依赖的安全加载检测
const md = window.markdownit ? window.markdownit() : null;
const { jsPDF } = window.jspdf || {};
const colorThief = window.ColorThief ? new window.ColorThief() : null;
const editorBox = document.getElementById('editorBox');
const hideFile = document.getElementById('hideFile');
const bgFile = document.getElementById('bgFile');
const noteList = document.getElementById('noteList');
const emptyTip = document.getElementById('emptyTip');
const searchInput = document.getElementById('searchInput');
let editor, preview;
let currentNoteId = null;
let notes = JSON.parse(localStorage.getItem('markdown_notes')) || [];

// 安全渲染 Markdown
function renderMarkdown(content) {
    if (md) {
        return md.render(content);
    } else {
        console.warn('markdown-it 未加载，显示纯文本');
        return `<pre style="white-space: pre-wrap;">${escapeHtml(content)}</pre>`;
    }
}

// 简单的防XSS辅助（仅用于降级显示）
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

window.addEventListener('DOMContentLoaded', function () {
    renderNoteList();
    bindAllButtons();
    // 如果依赖缺失，给出友好提示（不阻塞操作）
    if (!md) alert('提示：Markdown渲染库未加载，预览区将显示纯文本。');
    if (!jsPDF) console.warn('jspdf未加载，PDF导出功能不可用');
});

function bindAllButtons() {
    const btnIds = [
        'newNoteSide', 'saveBtn', 'delBtn', 'importBtn', 'importSide',
        'exportMdBtn', 'exportImgBtn', 'exportPdfBtn', 'setBgBtn', 'clearBgBtn'
    ];
    for (let id of btnIds) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.removeEventListener('click', getHandler(id)); // 避免重复绑定
            btn.addEventListener('click', getHandler(id));
        } else {
            console.warn(`未找到按钮: ${id}`);
        }
    }
}

function getHandler(id) {
    const map = {
        'newNoteSide': newNote,
        'saveBtn': saveNote,
        'delBtn': delNote,
        'importBtn': importFile,
        'importSide': importFile,
        'exportMdBtn': exportMd,
        'exportImgBtn': exportImg,
        'exportPdfBtn': exportPdf,
        'setBgBtn': setBg,
        'clearBgBtn': clearBg
    };
    return map[id] || (() => {});
}

function newNote() {
    const note = {
        id: Date.now().toString(),
        title: '无标题笔记',
        content: '# 新建笔记\n',
        time: new Date().toLocaleString()
    };
    notes.unshift(note);
    saveToLocal();
    renderNoteList();
    openNote(note.id);
}

function saveToLocal() {
    localStorage.setItem('markdown_notes', JSON.stringify(notes));
}

function renderNoteList(keyword = '') {
    if (!noteList) return;
    noteList.innerHTML = '';
    const filtered = notes.filter(n =>
        n.title.includes(keyword) || n.content.includes(keyword)
    );
    if (emptyTip) emptyTip.style.display = filtered.length ? 'none' : 'block';
    filtered.forEach(n => {
        const div = document.createElement('div');
        div.className = 'note-item ' + (n.id === currentNoteId ? 'active' : '');
        div.innerText = n.title;
        div.onclick = () => openNote(n.id);
        noteList.appendChild(div);
    });
}

function openNote(id) {
    currentNoteId = id;
    const note = notes.find(n => n.id === id);
    if (!note) return;
    editorBox.innerHTML = `
        <textarea id="editor">${escapeHtml(note.content)}</textarea>
        <div id="preview"></div>
    `;
    editor = document.getElementById('editor');
    preview = document.getElementById('preview');
    if (editor) editor.style.width = '50%';
    if (preview) preview.style.width = '50%';
    renderPreview();
    if (editor) {
        editor.addEventListener('input', () => {
            note.content = editor.value;
            saveToLocal();
            renderPreview();
        });
    }
    renderNoteList();
}

function renderPreview() {
    if (!editor || !preview) return;
    const rawContent = editor.value;
    preview.innerHTML = renderMarkdown(rawContent);
    const lineCount = rawContent.split('\n').length;
    const lineElem = document.getElementById('line');
    if (lineElem) lineElem.innerText = `Ln ${lineCount}`;
    const sizeKB = (new Blob([rawContent]).size / 1024).toFixed(1);
    const sizeElem = document.getElementById('size');
    if (sizeElem) sizeElem.innerText = `UTF-8 | ${sizeKB} KB`;
}

function saveNote() {
    if (!currentNoteId) { alert('请先打开笔记'); return; }
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    const blob = new Blob([note.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = note.title.replace(/[/\\:*?"<>|]/g, '') + '.md';
    a.click();
    URL.revokeObjectURL(url);
}

function delNote() {
    if (!currentNoteId) { alert('未选中笔记'); return; }
    if (!confirm('确定删除此笔记？')) return;
    notes = notes.filter(n => n.id !== currentNoteId);
    saveToLocal();
    currentNoteId = null;
    if (editorBox) editorBox.innerHTML = '<div class="editor-empty">已删除，请新建或导入笔记</div>';
    renderNoteList();
}

function importFile() {
    if (!hideFile) return;
    hideFile.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            const note = {
                id: Date.now().toString(),
                title: file.name.replace(/\.md$/i, ''),
                content: reader.result,
                time: new Date().toLocaleString()
            };
            notes.unshift(note);
            saveToLocal();
            renderNoteList();
            openNote(note.id);
            hideFile.value = '';
        };
    };
    hideFile.click();
}

function exportMd() { saveNote(); }

function exportImg() {
    if (!preview) { alert('无预览内容'); return; }
    if (typeof html2canvas === 'undefined') {
        alert('html2canvas库未加载，无法导出图片');
        return;
    }
    html2canvas(preview, { scale: 2 }).then(canvas => {
        const title = notes.find(n => n.id === currentNoteId)?.title || '文档';
        const a = document.createElement('a');
        a.download = title.replace(/[/\\:*?"<>|]/g, '') + '.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    }).catch(err => {
        alert('导出图片失败：' + err.message);
    });
}

function exportPdf() {
    if (!preview) { alert('无预览内容'); return; }
    if (typeof html2canvas === 'undefined' || !jsPDF) {
        alert('缺少必要库(html2canvas或jspdf)，无法导出PDF');
        return;
    }
    html2canvas(preview, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/jpeg');
        const pdf = new jsPDF('p', 'px', [canvas.width, canvas.height]);
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        const title = notes.find(n => n.id === currentNoteId)?.title || '文档';
        pdf.save(title.replace(/[/\\:*?"<>|]/g, '') + '.pdf');
    }).catch(err => {
        alert('导出PDF失败：' + err.message);
    });
}

// 搜索
if (searchInput) {
    searchInput.addEventListener('input', () => {
        renderNoteList(searchInput.value.trim());
    });
}

// 下拉菜单控制（独立，不影响按钮点击）
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.dropdown-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const parent = btn.closest('.dropdown');
            if (parent) {
                parent.classList.toggle('active');
                document.querySelectorAll('.dropdown').forEach(d => {
                    if (d !== parent) d.classList.remove('active');
                });
            }
        });
    });
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
    });
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        m.addEventListener('click', e => e.stopPropagation());
    });
});

// 背景设置（加入依赖检测）
function setBg() {
    if (!bgFile) return;
    bgFile.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        let opacity = prompt('背景透明度 0~1', '0.15');
        opacity = Math.min(1, Math.max(0, Number(opacity) || 0.15));
        if (editorBox) {
            editorBox.style.backgroundImage = `url(${url})`;
            editorBox.style.backgroundSize = 'cover';
            editorBox.style.backgroundPosition = 'center';
            editorBox.style.backgroundRepeat = 'no-repeat';
        }
        document.querySelectorAll('#editor, #preview').forEach(el => {
            el.style.backgroundColor = `rgba(255,255,255,${1 - opacity})`;
            el.style.background = 'transparent';
        });
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        if (colorThief) {
            img.onload = () => {
                try {
                    const c = colorThief.getColor(img);
                    const rgb = `${c[0]},${c[1]},${c[2]}`;
                    const sidebar = document.querySelector('.sidebar');
                    const topBar = document.querySelector('.top-bar');
                    const statusBar = document.querySelector('.status-bar');
                    if (sidebar) sidebar.style.backgroundColor = `rgba(${rgb}, 0.25)`;
                    if (topBar) topBar.style.backgroundColor = `rgba(${rgb}, 0.15)`;
                    if (statusBar) statusBar.style.backgroundColor = `rgba(${rgb}, 0.1)`;
                } catch(e) { console.warn('取色失败', e); }
            };
        }
        bgFile.value = '';
    };
    bgFile.click();
}

// ✅ 已修复：清除背景彻底还原黑白主题
function clearBg() {
    if (editorBox) editorBox.style.backgroundImage = 'none';
    document.querySelectorAll('#editor, #preview').forEach(el => {
        el.style.backgroundColor = '#ffffff';
        el.style.background = '';
    });
    const sidebar = document.querySelector('.sidebar');
    const topBar = document.querySelector('.top-bar');
    const statusBar = document.querySelector('.status-bar');
    if (sidebar) sidebar.style.backgroundColor = '#ffffff';
    if (topBar) topBar.style.backgroundColor = '#ffffff';
    if (statusBar) statusBar.style.backgroundColor = '#ffffff';
}