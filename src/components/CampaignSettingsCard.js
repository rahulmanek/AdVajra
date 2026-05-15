/**
 * CampaignSettingsCard.js
 *
 * Compact 2-row meta box with status, schedule toggle, and action buttons
 * Refactored to use CSS classes per styling guidelines
 */
import React, { useState } from 'react';
import { Modal, Button, Icon } from '@wordpress/components';
import { trash, copy, calendar } from '@wordpress/icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import SmartSelect from './SmartSelect';
import { STATUS_CONFIG } from '../pages/AdManager/AdSchema';
import { PRICING_URL } from '../utils/urls';

const CampaignSettingsCard = ({
    status,
    setStatus,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    onDelete,
    onDuplicate,
    isNew,
    isPro = false,
    // New Advanced Scheduling Props
    scheduleTimeStart,
    setScheduleTimeStart,
    scheduleTimeEnd,
    setScheduleTimeEnd,
    scheduleWeekdays,
    setScheduleWeekdays
}) => {
    const isScheduled = !!(startDate || endDate || (scheduleWeekdays && scheduleWeekdays.length > 0));
    const [showSchedule, setShowSchedule] = useState(isScheduled);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const weekDayOptions = [
        { label: 'M', value: '1' },
        { label: 'Tu', value: '2' },
        { label: 'W', value: '3' },
        { label: 'Th', value: '4' },
        { label: 'F', value: '5' },
        { label: 'Sa', value: '6' },
        { label: 'Su', value: '7' },
    ];

    const toggleWeekday = (val) => {
        const current = scheduleWeekdays || [];
        if (current.includes(val)) {
            setScheduleWeekdays(current.filter(d => d !== val));
        } else {
            setScheduleWeekdays([...current, val]);
        }
    };

    const getComputedStatus = () => {
        if (!showSchedule) return null;
        if (!startDate && !endDate) return null;

        const now = new Date();
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        let statusKey = 'publish';
        if (start && now < start) statusKey = 'future';
        else if (end && now > end) statusKey = 'expired';

        return { ...STATUS_CONFIG[statusKey], key: statusKey };
    };

    const computedStatus = getComputedStatus();

    const handleDeleteConfirm = () => {
        setDeleteModalOpen(false);
        onDelete();
    };

    return (
        <div className="advajra-card campaign-settings-card">
            {/* Row 1: Status + Action Buttons */}
            <div className="csc-row">

                {/* Status Dropdown */}
                <div className="csc-status-wrapper">
                    {computedStatus ? (
                        <div className={`av-status-wrapper ${computedStatus.key}`}>
                            <div className="status-dot" />
                            <span className="status-label">
                                {computedStatus.label}
                            </span>
                            <span className="auto-tag">Auto</span>
                        </div>
                    ) : (
                        <SmartSelect
                            value={status}
                            onChange={setStatus}
                            options={Object.entries(STATUS_CONFIG)
                                .filter(([key]) => ['publish', 'paused', 'draft', 'archived'].includes(key))
                                .map(([key, cfg]) => ({
                                    label: cfg.label,
                                    value: key,
                                    icon: (
                                        <span className={`av-status-dot ${key}`} />
                                    )
                                }))
                            }
                        />
                    )}
                </div>

                {/* Schedule Toggle Button */}
                <button
                    className={`csc-icon-btn csc-schedule-btn ${showSchedule ? 'active' : ''}`}
                    onClick={() => setShowSchedule(!showSchedule)}
                    title="Schedule Ad"
                >
                    <Icon icon={calendar} size={18} />
                </button>

                {/* Duplicate Button (PRO) */}
                <button
                    className="csc-icon-btn csc-duplicate-btn"
                    disabled={!isPro}
                    onClick={isPro ? onDuplicate : undefined}
                    title="Duplicate (Pro feature)"
                >
                    <Icon icon={copy} size={18} />
                    <span className="pro-badge">PRO</span>
                </button>

                {/* Delete Button */}
                {!isNew && (
                    <button
                        className="csc-icon-btn csc-delete-btn"
                        onClick={() => setDeleteModalOpen(true)}
                        title="Delete Campaign"
                    >
                        <Icon icon={trash} size={18} />
                    </button>
                )}
            </div>

            {/* Row 2: Schedule Date Fields */}
            {showSchedule && (
                <div className="csc-schedule-container">
                    {/* Date Range Selector */}
                    <div className="csc-schedule-fields">
                        <div className="csc-date-field">
                            <label className="advajra-label">Start Date & Time</label>
                            <DatePicker
                                selected={startDate ? new Date(startDate) : null}
                                onChange={(date) => setStartDate(date ? date.toISOString() : '')}
                                showTimeInput
                                timeInputLabel="Time:"
                                dateFormat="MMM d, yyyy h:mm aa"
                                placeholderText="Select start date & time"
                                className="advajra-input csc-datepicker-input"
                                calendarClassName="advajra-calendar"
                                popperClassName="advajra-datepicker-popper"
                                isClearable
                                portalId="advajra-app"
                            />
                        </div>
                        <div className="csc-date-field">
                            <label className="advajra-label">End Date & Time</label>
                            <DatePicker
                                selected={endDate ? new Date(endDate) : null}
                                onChange={(date) => setEndDate(date ? date.toISOString() : '')}
                                showTimeInput
                                timeInputLabel="Time:"
                                dateFormat="MMM d, yyyy h:mm aa"
                                placeholderText="Select end date & time"
                                className="advajra-input csc-datepicker-input"
                                calendarClassName="advajra-calendar"
                                popperClassName="advajra-datepicker-popper"
                                isClearable
                                minDate={startDate ? new Date(startDate) : null}
                                portalId="advajra-app"
                            />
                        </div>
                    </div>

                    {/* Weekday Selector — PRO Feature */}
                    <div className={`csc-weekday-section ${!isPro ? 'is-locked' : ''}`}>
                        <label className="advajra-label">
                            Run Only On
                            {!isPro && <a href={ PRICING_URL.campaignSettingsBadge } target="_blank" rel="noopener noreferrer" className="pro-badge pro-badge--inline">PRO</a>}
                        </label>
                        <div className="csc-weekday-selector">
                            {weekDayOptions.map(day => {
                                const isActive = isPro && (scheduleWeekdays || []).includes(day.value);
                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        className={`csc-weekday-btn ${isActive ? 'active' : ''}`}
                                        onClick={() => isPro && toggleWeekday(day.value)}
                                        disabled={!isPro}
                                    >
                                        {day.label}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="csc-weekday-hint">Leave all unselected to run every day</p>
                    </div>

                    <div className="csc-timezone-indicator">
                        <span className="timezone-icon">🌐</span>
                        <span className="timezone-text">
                            Times in: {window.advajraSettings?.timezone || 'UTC'} ({window.advajraSettings?.timezone_offset || 'UTC+0:00'})
                        </span>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <Modal
                    title="Delete Campaign"
                    onRequestClose={() => setDeleteModalOpen(false)}
                    className="csc-delete-modal"
                >
                    <div className="modal-message">
                        <p>Are you sure you want to delete this campaign?</p>
                        <p className="warning-box">
                            ⚠️ This action is permanent. Data cannot be recovered.
                        </p>
                    </div>
                    <div className="modal-actions">
                        <Button
                            variant="primary"
                            isDestructive
                            onClick={handleDeleteConfirm}
                        >
                            Delete Permanently
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CampaignSettingsCard;
