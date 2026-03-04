import AsyncStorage from '@react-native-async-storage/async-storage';

const PROJECTS_KEY = '@rce_projects';

/**
 * Load all saved projects from AsyncStorage
 * @returns {Promise<Array>} Array of project objects
 */
export async function loadProjects() {
    try {
        const json = await AsyncStorage.getItem(PROJECTS_KEY);
        return json ? JSON.parse(json) : [];
    } catch (e) {
        console.error('loadProjects error:', e);
        return [];
    }
}

/**
 * Save or update a project
 * @param {Object} project - { id, name, files, updatedAt }
 */
export async function saveProject(project) {
    try {
        const projects = await loadProjects();
        const idx = projects.findIndex((p) => p.id === project.id);
        if (idx >= 0) {
            projects[idx] = { ...project, updatedAt: Date.now() };
        } else {
            projects.unshift({ ...project, createdAt: Date.now(), updatedAt: Date.now() });
        }
        await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
        console.error('saveProject error:', e);
    }
}

/**
 * Delete a project by ID
 * @param {string} id
 */
export async function deleteProject(id) {
    try {
        const projects = await loadProjects();
        const filtered = projects.filter((p) => p.id !== id);
        await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('deleteProject error:', e);
    }
}
