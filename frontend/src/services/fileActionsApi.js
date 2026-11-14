/**
 * Direct file editing and management API client methods.
 */
import { request } from './api';

export const fileActionsApi = {
  async saveFile(path, content) {
    const res = await request('/api/v1/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    return res.json();
  },

  async createItem(path, isDir = false) {
    const res = await request('/api/v1/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, is_dir: isDir }),
    });
    return res.json();
  },

  async deleteItem(path) {
    const res = await request('/api/v1/files/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    return res.json();
  },

  async renameItem(path, newName) {
    const res = await request('/api/v1/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, new_name: newName }),
    });
    return res.json();
  },

  async moveItem(sourcePath, destinationFolder) {
    const res = await request('/api/v1/files/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_path: sourcePath,
        destination_folder: destinationFolder,
      }),
    });
    return res.json();
  },
};
