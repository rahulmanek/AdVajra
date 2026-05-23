import React, { useEffect, useState, useCallback } from 'react';
import apiFetch from '@wordpress/api-fetch';

const ReviewNoticeBanner = ({ onVisibilityChange = null }) => {
	const [loading, setLoading] = useState(true);
	const [notice, setNotice] = useState(null);
	const [isDismissing, setIsDismissing] = useState(false);

	useEffect(() => {
		let mounted = true;

		const load = async () => {
			try {
				const payload = await apiFetch({ path: '/advajra/v1/review-notice' });
				if (!mounted) {
					return;
				}

				if (payload?.eligible) {
					setNotice(payload);
				}
			} catch (e) {
				// Quiet failure: review notice must never break app UX.
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		load();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (typeof onVisibilityChange === 'function') {
			onVisibilityChange(Boolean(notice?.eligible));
		}
	}, [notice, onVisibilityChange]);

	const persistDismissal = useCallback(async () => {
		if (isDismissing) {
			return;
		}

		setIsDismissing(true);
		setNotice(null);

		try {
			await apiFetch({ path: '/advajra/v1/review-notice/dismiss', method: 'POST' });
		} catch (e) {
			// Keep notice dismissed visually once user chooses to dismiss.
		} finally {
			setIsDismissing(false);
		}
	}, [isDismissing]);

	if (loading || !notice?.eligible) {
		return null;
	}

	return (
		<section className="av-review-notice" aria-label="Review notice">
			<div className="av-review-notice__content">
				<p className="av-review-notice__message">{notice.message}</p>
				<div className="av-review-notice__actions">
					<a
						className="av-review-notice__primary"
						href={notice.review_url}
						target="_blank"
						rel="noopener noreferrer"
						onClick={persistDismissal}
					>
						Leave Review ❤️
					</a>
					<button
						type="button"
						className="av-review-notice__dismiss"
						onClick={persistDismissal}
						disabled={isDismissing}
					>
						Dismiss
					</button>
				</div>
			</div>
		</section>
	);
};

export default ReviewNoticeBanner;
