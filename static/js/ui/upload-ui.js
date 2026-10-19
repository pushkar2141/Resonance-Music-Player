/**
 * Resonance — Multi-File Drag & Drop Upload Controller with Per-File Progress
 */
import { uploadFileWithProgress } from '../core/api.js';
import { escapeHtml } from '../utils/format.js';
import { showToast } from './toast.js';

export function initUploadUI(onUploadsComplete) {
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('file-upload-input');
  const chooseBtn = document.getElementById('btn-choose-files');
  const progressList = document.getElementById('upload-progress-list');

  if (!dropzone || !fileInput) return;

  const triggerPicker = (e) => {
    e.stopPropagation();
    fileInput.click();
  };

  if (chooseBtn) chooseBtn.addEventListener('click', triggerPicker);
  dropzone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach((evtName) => {
    dropzone.addEventListener(evtName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('is-selected-surface');
    });
  });

  ['dragleave', 'drop'].forEach((evtName) => {
    dropzone.addEventListener(evtName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('is-selected-surface');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) handleFilesBatch(files);
  });

  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files || []);
    if (files.length) handleFilesBatch(files);
    fileInput.value = '';
  });

  async function handleFilesBatch(files) {
    if (!progressList) return;
    let addedCount = 0;

    for (const file of files) {
      const row = document.createElement('div');
      row.className = 'glass-g1';
      row.style.cssText = 'padding:12px 16px; display:flex; flex-direction:column; gap:6px;';
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <span class="text-ui truncate" style="font-weight:600;">${escapeHtml(file.name)}</span>
          <span class="text-caption tabular-nums" data-status>0%</span>
        </div>
        <div class="progress-track" style="height:5px; pointer-events:none;">
          <div class="progress-fill" data-bar style="width:0%;"></div>
        </div>
      `;
      progressList.prepend(row);

      const statusEl = row.querySelector('[data-status]');
      const barEl = row.querySelector('[data-bar]');

      try {
        await uploadFileWithProgress(file, (pct) => {
          if (statusEl) statusEl.textContent = `${pct}%`;
          if (barEl) barEl.style.width = `${pct}%`;
        });
        if (statusEl) {
          statusEl.textContent = 'Added';
          statusEl.style.color = 'var(--c-success)';
        }
        if (barEl) barEl.style.width = '100%';
        addedCount++;
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = err.status === 409 ? 'Duplicate' : 'Rejected';
          statusEl.style.color = 'var(--c-error)';
        }
        showToast(err.message || `Failed to upload ${file.name}`, 'error');
      }
    }

    if (addedCount > 0) {
      showToast(`Uploaded ${addedCount} track${addedCount === 1 ? '' : 's'} to Resonance`, 'success');
      if (typeof onUploadsComplete === 'function') {
        await onUploadsComplete();
      }
    }
  }
}
