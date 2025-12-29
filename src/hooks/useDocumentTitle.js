/**
 * useDocumentTitle
 *
 * Sets the browser document.title to follow WordPress admin convention:
 *   "Page ‹ AdVajra — WordPress"
 *
 * @param {string} title - The page title (e.g. "Dashboard", "Edit: My Ad")
 */
import { useEffect } from 'react';

const PLUGIN_NAME = 'AdVajra';

const useDocumentTitle = (title) => {
    useEffect(() => {
        document.title = title
            ? `${title} \u2039 ${PLUGIN_NAME} \u2014 WordPress`
            : `${PLUGIN_NAME} \u2014 WordPress`;
    }, [title]);
};

export default useDocumentTitle;
