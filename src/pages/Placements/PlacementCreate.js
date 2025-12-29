/**
 * PlacementCreate.js
 *
 * 4-step guided wizard for creating placements.
 * Step 1: Choose Type
 * Step 2: Choose Position
 * Step 3: Assign Ad/Group
 * Step 4: Review & Create
 */
import React, { useState } from 'react';
import { Button, Spinner, Icon, TextControl, RadioControl } from '@wordpress/components';
import { header, footer, paragraph, widget, code, chevronLeft, arrowRight, check, plus } from '@wordpress/icons';
import { useSelect, useDispatch } from '@wordpress/data';
import { useNavigate } from 'react-router-dom';
import { STORE_NAME } from '../../store/constants';
import useDocumentTitle from '../../hooks/useDocumentTitle';

// Placement type configurations
const PLACEMENT_TYPES = [
    {
        id: 'content',
        icon: paragraph,
        label: 'In Content',
        description: 'Inject ad into post/page body',
        color: '#10b981'
    },
    {
        id: 'header',
        icon: header,
        label: 'Header',
        description: 'Before page content',
        color: '#3b82f6'
    },
    {
        id: 'footer',
        icon: footer,
        label: 'Footer',
        description: 'After page content',
        color: '#64748b'
    },
    {
        id: 'shortcode',
        icon: code,
        label: 'Manual (Shortcode)',
        description: 'Place ad manually with shortcode',
        color: '#ec4899'
    },
];

// Position diagram SVG component
const PositionDiagram = ({ position, paragraphNum }) => {
    const getHighlightPosition = () => {
        switch (position) {
            case 'before_content': return 0;
            case 'after_paragraph': return paragraphNum;
            case 'after_content': return 4;
            default: return 0;
        }
    };
    const highlightPos = getHighlightPosition();

    return (
        <svg viewBox="0 0 300 200" className="av-position-diagram">
            {/* Title bar */}
            <rect x="20" y="10" width="260" height="20" rx="3" fill="#e2e8f0" />
            <text x="30" y="24" fontSize="10" fill="#64748b">Post Title</text>

            {/* Paragraphs */}
            {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                    {/* Show ad highlight before paragraph */}
                    {highlightPos === i && (
                        <rect x="20" y={40 + i * 35} width="260" height="24" rx="4"
                            fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="2" />
                    )}
                    {highlightPos === i && (
                        <text x="150" y={56 + i * 35} fontSize="10" fill="#10b981" textAnchor="middle" fontWeight="600">
                            📍 Your Ad Here
                        </text>
                    )}
                    {/* Paragraph block */}
                    <rect
                        x="20"
                        y={highlightPos <= i ? 70 + i * 35 : 40 + i * 35}
                        width="260"
                        height="18"
                        rx="2"
                        fill="#f1f5f9"
                    />
                    <text
                        x="30"
                        y={highlightPos <= i ? 82 + i * 35 : 52 + i * 35}
                        fontSize="9"
                        fill="#94a3b8"
                    >
                        Paragraph {i + 1}
                    </text>
                </g>
            ))}

            {/* After content highlight */}
            {highlightPos === 4 && (
                <g>
                    <rect x="20" y="175" width="260" height="24" rx="4"
                        fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="2" />
                    <text x="150" y="191" fontSize="10" fill="#10b981" textAnchor="middle" fontWeight="600">
                        📍 Your Ad Here
                    </text>
                </g>
            )}
        </svg>
    );
};

// Step components - Dynamic steps based on type
const StepIndicator = ({ steps, currentStepIndex }) => (
    <div className="av-step-indicator">
        {steps.map((stepNum, i) => (
            <div
                key={stepNum}
                className={`av-step-dot ${i === currentStepIndex ? 'active' : ''} ${i < currentStepIndex ? 'completed' : ''}`}
            >
                {i < currentStepIndex ? <Icon icon={check} size={12} /> : i + 1}
            </div>
        ))}
    </div>
);

const PlacementCreate = () => {
    const navigate = useNavigate();

    useDocumentTitle('New Placement');
    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [searchAd, setSearchAd] = useState('');

    // ── Data from centralised store ──
    const { ads, groups, placements, isLoading } = useSelect( ( select ) => {
        const store = select( STORE_NAME );
        return {
            ads:        store.getAds(),
            groups:     store.getGroups(),
            placements: store.getPlacements(),
            isLoading:  ! store.hasLoadedAds() || ! store.hasLoadedGroups() || ! store.hasLoadedPlacements(),
        };
    }, [] );

    const { createPlacement } = useDispatch( STORE_NAME );

    const getErrorMessage = (err) => {
        if (!err) return 'Failed to create placement.';
        if (typeof err === 'string') return err;
        if (err.message) return err.message;
        if (err.data?.message) return err.data.message;
        if (Array.isArray(err?.details) && err.details[0]?.message) return err.details[0].message;
        return 'Failed to create placement.';
    };

    // Draft placement data
    const [draft, setDraft] = useState({
        name: '',
        type: '',
        position: 'before_content',
        paragraphNum: 3,
        itemType: 'ad',
        itemId: null,
    });

    // Update draft
    const updateDraft = (key, value) => {
        setDraft(prev => ({ ...prev, [key]: value }));
    };

    // Determine steps based on type - content needs position step, others don't
    const needsPositionStep = draft.type === 'content';
    const steps = needsPositionStep ? [1, 2, 3, 4] : [1, 3, 4]; // Skip step 2 for non-content
    const stepLabels = needsPositionStep
        ? ['Type', 'Position', 'Ad', 'Review']
        : ['Type', 'Ad', 'Review'];

    // Current step index in the steps array
    const currentStepIndex = steps.indexOf(step);

    // Navigation with smart skip
    const nextStep = () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < steps.length) {
            setStep(steps[nextIndex]);
        }
    };
    const prevStep = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setStep(steps[prevIndex]);
        }
    };

    // Can proceed to next step?
    const canProceed = () => {
        switch (step) {
            case 1: return !!draft.type;
            case 2: return !!draft.position;
            case 3: return true; // Ad/Group selection is optional
            case 4: return true;
            default: return false;
        }
    };

    // Is this the last step?
    const isLastStep = currentStepIndex === steps.length - 1;

    // Save placement
    const handleCreate = async () => {
        setIsSaving(true);

        const newPlacement = {
            // id: generated by backend
            name: draft.name || `${getPositionLabel()} Placement`,
            type: draft.type === 'content'
                ? (draft.position === 'after_paragraph' ? 'after_paragraph' : draft.position)
                : draft.type,
            item_type: draft.itemType,
            item_id: draft.itemId ? parseInt(draft.itemId, 10) : null,
            args: draft.position === 'after_paragraph' ? { paragraph: draft.paragraphNum } : {},
            status: 'active', // Default status for API to handle
        };

        try {
            await createPlacement(newPlacement);
            navigate('/placements');
        } catch (err) {
            console.error(err);
            alert(getErrorMessage(err));
        }
        setIsSaving(false);
    };

    // Get human-readable position label
    const getPositionLabel = () => {
        // For content types, use position
        if (draft.type === 'content') {
            if (draft.position === 'before_content') return 'Before Content';
            if (draft.position === 'after_content') return 'After Content';
            if (draft.position === 'after_paragraph') return `After Paragraph ${draft.paragraphNum}`;
            return draft.position || 'Content';
        }
        // For non-content types, use type name
        const typeConfig = PLACEMENT_TYPES.find(t => t.id === draft.type);
        return typeConfig?.label || draft.type || 'Unknown';
    };

    // Helper to extract title string from WordPress title object
    const getTitle = (item) => {
        if (!item?.title) return 'Untitled';
        if (typeof item.title === 'string') return item.title;
        return item.title.raw || 'Untitled';
    };

    // Get selected ad/group name
    const getItemName = () => {
        if (draft.itemType === 'ad') {
            const ad = ads.find(a => a.id === parseInt(draft.itemId, 10));
            return getTitle(ad);
        }
        const group = groups.find(g => g.id === parseInt(draft.itemId, 10));
        return getTitle(group);
    };

    // Filtered items for Step 3
    const filteredItems = [...ads, ...groups.map(g => ({ ...g, isGroup: true }))].filter(item => {
        if (!searchAd) return true;
        const title = getTitle(item);
        return title.toLowerCase().includes(searchAd.toLowerCase());
    });

    if (isLoading) {
        return <div className="av-loading-container"><Spinner /></div>;
    }

    return (
        <div className="av-wizard-page">
            {/* Header Pill - Matches Ad Editor */}
            <div className="advajra-editor-toolbar">
                <div className="toolbar-left">
                    <Button
                        icon={chevronLeft}
                        className="back-btn"
                        onClick={() => navigate('/placements')}
                        label="Back"
                    />

                    <div className="ad-identity-group">
                        <input
                            type="text"
                            value={draft.name}
                            onChange={(e) => updateDraft('name', e.target.value)}
                            placeholder="Placement Name"
                            className="av-toolbar-input"
                        />
                    </div>
                </div>
                <div className="toolbar-right">
                    <StepIndicator steps={steps} currentStepIndex={currentStepIndex} />
                </div>
            </div>

            {/* Step Content */}
            <div className="av-wizard-content">

                {/* Step 1: Choose Type */}
                {step === 1 && (
                    <div className="av-wizard-step">
                        <h2 className="av-heading">Choose Placement Position</h2>
                        <p className="av-subtitle">Where do you want to display your ad?</p>

                        <div className="av-type-grid">
                            {PLACEMENT_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    className={`av-type-card ${draft.type === type.id ? 'selected' : ''}`}
                                    onClick={() => updateDraft('type', type.id)}
                                >
                                    <div className="av-type-icon" style={{ backgroundColor: `${type.color}15`, color: type.color }}>
                                        <Icon icon={type.icon} size={28} />
                                    </div>
                                    <h3>{type.label}</h3>
                                    <p>{type.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Choose Position */}
                {step === 2 && (
                    <div className="av-wizard-step">
                        <h2 className="av-heading">Choose Position</h2>
                        <p className="av-subtitle">Select exactly where the ad should appear.</p>

                        <div className="av-position-layout">
                            <div className="av-position-options">
                                {draft.type === 'content' && (
                                    <>
                                        <button
                                            type="button"
                                            className={`av-radio-card ${draft.position === 'before_content' ? 'selected' : ''}`}
                                            onClick={() => updateDraft('position', 'before_content')}
                                        >
                                            Before Content
                                        </button>

                                        <button
                                            type="button"
                                            className={`av-radio-card ${draft.position === 'after_paragraph' ? 'selected' : ''}`}
                                            onClick={() => updateDraft('position', 'after_paragraph')}
                                        >
                                            <span>After Paragraph</span>
                                            {draft.position === 'after_paragraph' && (
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="20"
                                                    value={draft.paragraphNum}
                                                    onChange={(e) => updateDraft('paragraphNum', parseInt(e.target.value, 10) || 1)}
                                                    className="av-paragraph-input"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            className={`av-radio-card ${draft.position === 'after_content' ? 'selected' : ''}`}
                                            onClick={() => updateDraft('position', 'after_content')}
                                        >
                                            After Content
                                        </button>
                                    </>
                                )}

                                {draft.type !== 'content' && (
                                    <div className="av-simple-position">
                                        <p>
                                            {draft.type === 'header' && 'Ad will appear in the header area.'}
                                            {draft.type === 'footer' && 'Ad will appear in the footer area.'}
                                            {draft.type === 'shortcode' && 'Use [advajra placement="X"] shortcode to display.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Diagram */}
                            {draft.type === 'content' && (
                                <div className="av-position-preview">
                                    <PositionDiagram position={draft.position} paragraphNum={draft.paragraphNum} />
                                    <p className="av-helper-text">
                                        Ad will appear <strong>{getPositionLabel().toLowerCase()}</strong>.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Assign Ad/Group */}
                {step === 3 && (
                    <div className="av-wizard-step">
                        <h2 className="av-heading">Assign Ad or Group</h2>
                        <p className="av-subtitle">Choose what content to display in this placement.</p>

                        <TextControl
                            value={searchAd}
                            onChange={setSearchAd}
                            placeholder="Search ads and groups..."
                            className="av-ad-search"
                        />

                        <div className="av-ad-list">
                            {filteredItems.length === 0 ? (
                                <p className="av-no-items">No ads or groups found.</p>
                            ) : (
                                filteredItems.map(item => (
                                    <button
                                        key={`${item.isGroup ? 'group' : 'ad'}-${item.id}`}
                                        className={`av-ad-item ${draft.itemId === item.id && draft.itemType === (item.isGroup ? 'group' : 'ad') ? 'selected' : ''}`}
                                        onClick={() => {
                                            const isSelected = draft.itemId === item.id && draft.itemType === (item.isGroup ? 'group' : 'ad');
                                            if (isSelected) {
                                                // Deselect if already selected
                                                updateDraft('itemType', 'ad');
                                                updateDraft('itemId', null);
                                            } else {
                                                // Select the item
                                                updateDraft('itemType', item.isGroup ? 'group' : 'ad');
                                                updateDraft('itemId', item.id);
                                            }
                                        }}
                                    >
                                        <span className="av-ad-name">{getTitle(item)}</span>
                                        <span className={`av-badge ${item.isGroup ? 'av-badge-info' : 'av-badge-default'}`}>
                                            {item.isGroup ? 'Group' : 'Ad'}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                    <div className="av-wizard-step">
                        <h2 className="av-heading">Review & Create</h2>
                        <p className="av-subtitle">Confirm your placement settings.</p>

                        <div className="av-review-card">
                            <div className="av-review-summary">
                                <div className="av-review-item">
                                    <span className="label">Position:</span>
                                    <span className="value">{getPositionLabel()}</span>
                                </div>
                                {draft.itemId ? (
                                    <div className="av-review-item">
                                        <span className="label">Shows:</span>
                                        <span className="value">{getItemName()}</span>
                                    </div>
                                ) : (
                                    <div className="av-review-item">
                                        <span className="label">Shows:</span>
                                        <span className="value av-text-warning">No ad assigned yet</span>
                                    </div>
                                )}
                            </div>

                            {draft.itemId && (
                                <p className="av-review-sentence">
                                    <strong>Summary:</strong> Show "{getItemName()}" {getPositionLabel().toLowerCase()}.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="av-wizard-footer">
                {currentStepIndex > 0 && (
                    <Button variant="secondary" onClick={prevStep}>
                        <Icon icon={chevronLeft} size={16} /> Back
                    </Button>
                )}
                <div className="av-spacer" />
                {!isLastStep ? (
                    <Button variant="primary" onClick={nextStep} disabled={!canProceed()}>
                        Next <Icon icon={arrowRight} size={16} />
                    </Button>
                ) : (
                    <Button variant="primary" onClick={handleCreate} isBusy={isSaving} disabled={isSaving}>
                        <Icon icon={plus} size={16} /> Create Placement
                    </Button>
                )}
            </div>
        </div>
    );
};

export default PlacementCreate;
