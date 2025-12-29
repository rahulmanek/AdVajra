/**
 * TargetingBuilder.js
 */
import React, { useState, useEffect } from 'react';
import { Button, Icon } from '@wordpress/components';
import { plus } from '@wordpress/icons';
import apiFetch from '@wordpress/api-fetch';

import RuleGroup from './RuleGroup';
import GroupOperator from './GroupOperator';

const TargetingBuilder = ({ value, onChange }) => {
    const [availableConditions, setAvailableConditions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingGroups, setDeletingGroups] = useState([]);

    // Fetch available conditions
    useEffect(() => {
        apiFetch({ path: '/advajra/v1/targeting' }).then(data => {
            setAvailableConditions(data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    // Migrate old flat rules to new groups format & ensure default state
    useEffect(() => {
        if (!value) {
            onChange({ relation: 'AND', groups: [] });
            return;
        }

        // Migration: if old `rules` array exists, convert to single group
        if (value.rules && !value.groups) {
            const migratedGroups = value.rules.length > 0 ? [{
                id: `group-${Date.now()}`,
                relation: 'AND',
                rules: value.rules
            }] : [];
            onChange({ relation: value.relation || 'AND', groups: migratedGroups });
            return;
        }

        // Ensure groups array exists
        if (!value.groups) {
            onChange({ ...value, groups: [] });
        }
    }, []);

    const addGroup = () => {
        const defaultParam = availableConditions.length > 0 ? availableConditions[0].id : '';
        const defaultOperator = defaultParam
            ? Object.keys(availableConditions.find(c => c.id === defaultParam)?.operators || {})[0] || '=='
            : '==';

        const newGroup = {
            id: `group-${Date.now()}`,
            relation: 'AND',
            rules: [{ param: defaultParam, operator: defaultOperator, value: '' }]
        };

        onChange({ ...value, groups: [...(value.groups || []), newGroup] });
    };

    const updateGroup = (groupIndex, updatedGroup) => {
        const newGroups = [...(value.groups || [])];
        newGroups[groupIndex] = updatedGroup;
        onChange({ ...value, groups: newGroups });
    };

    // Animated group deletion
    const removeGroup = (groupIndex) => {
        setDeletingGroups(prev => [...prev, groupIndex]);
        setTimeout(() => {
            const newGroups = (value.groups || []).filter((_, i) => i !== groupIndex);
            setDeletingGroups(prev => prev.filter(i => i !== groupIndex));
            onChange({ ...value, groups: newGroups });
        }, 350); // Match animation duration
    };

    const updateGlobalRelation = (newRelation) => {
        onChange({ ...value, relation: newRelation });
    };

    if (loading) return <div style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>Loading Logic...</div>;

    const groups = value?.groups || [];

    return (
        <div className="advajra-targeting-builder">
            <div className="advajra-logic-stream">

                {/* Empty State */}
                {groups.length === 0 && (
                    <div className="advajra-add-rule-btn" onClick={addGroup}>
                        <span>✨</span>
                        <div>
                            Start Targeting Logic
                            <div style={{ fontSize: '12px', opacity: 0.7, fontWeight: 400 }}>Ad is currently visible to everyone</div>
                        </div>
                    </div>
                )}

                {/* Render Groups */}
                {groups.map((group, index) => (
                    <React.Fragment key={group.id || index}>
                        {/* Group Operator (between groups) */}
                        {index > 0 && (
                            <GroupOperator
                                value={value.relation}
                                onChange={updateGlobalRelation}
                            />
                        )}

                        {/* The Group */}
                        <RuleGroup
                            group={group}
                            groupIndex={index}
                            availableConditions={availableConditions}
                            onUpdateGroup={updateGroup}
                            onRemoveGroup={removeGroup}
                            canRemove={groups.length > 1}
                            isDeleting={deletingGroups.includes(index)}
                        />
                    </React.Fragment>
                ))}

                {/* Add Group Button */}
                {groups.length > 0 && (
                    <div className="advajra-add-group-btn" onClick={addGroup}>
                        <Icon icon={plus} size={20} />
                        <span>Add New Group</span>
                    </div>
                )}

            </div>
        </div>
    );
};

export default TargetingBuilder;
