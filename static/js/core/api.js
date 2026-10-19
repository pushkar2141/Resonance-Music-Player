/**
 * Resonance — REST API Client & XHR Upload Helper
 */

export async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(path, {
    ...options,
    headers,
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const msg = data && typeof data === 'object' && data.error ? data.error : `Request failed (${response.status})`;
    const err = new Error(msg);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function uploadFileWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('files', file);

    xhr.open('POST', '/api/songs/upload', true);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && typeof onProgress === 'function') {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      let json = {};
      try {
        json = JSON.parse(xhr.responseText || '{}');
      } catch (_e) {}
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(json);
      } else {
        const err = new Error(json.error || `Upload failed (${xhr.status})`);
        err.status = xhr.status;
        err.data = json;
        reject(err);
      }
    };

    xhr.onerror = () => reject(new Error('Network error during file upload.'));
    xhr.send(formData);
  });
}
