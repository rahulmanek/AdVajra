/**
 * RuleGroup.js
 */
import React, { useState } from 'react';
import { Button, Icon } from '@wordpress/components';
import { trash, plus, mobile, people, category, page, globe } from '@wordpress/icons';
import MultiSelect from './MultiSelect';
import SmartSelect from './SmartSelect';

const MULTI_SELECTABLE_TYPES = ['post_type', 'category', 'device', 'user_role'];

const getIconForType = (type) => {
    switch(type) {
        case 'device': return mobile;
        case 'user_role': return people;
        case 'category': return category;
        case 'post_type': return page;
        default: return globe;
    }
};

const RuleGroup = ({
    group,
    groupIndex,
    availableConditions,
    onUpdateGroup,
    onRemoveGroup,
    canRemove,
    isDeleting = false
}) => {
    const { relation, rules } = group;
    const [deletingRules, setDeletingRules] = useState([]);

    const addRule = () => {
        const defaultParam = availableConditions.length > 0 ? availableConditions[0].id : '';
        const newRule = { param: defaultParam, operator: '==', value: '' };
        if (defaultParam) {
            const condition = availableConditions.find(c => c.id === defaultParam);
            if (condition) newRule.operator = Object.keys(condition.operators)[0];
        }
        onUpdateGroup(groupIndex, { ...group, rules: [...rules, newRule] });
    };

    const updateRule = (ruleIndex, key, newVal) => {
        const newRules = [...rules];
        newRules[ruleIndex] = { ...newRules[ruleIndex], [key]: newVal };
        if (key === 'param') {
            const condition = availableConditions.find(c => c.id === newVal);
            if (condition) {
                newRules[ruleIndex].operator = Object.keys(condition.operators)[0];
                newRules[ruleIndex].value = '';
            }
        }
        onUpdateGroup(groupIndex, { ...group, rules: newRules });
    };

    // Animated delete for rules
    const removeRule = (ruleIndex) => {
        setDeletingRules(prev => [...prev, ruleIndex]);
        setTimeout(() => {
            const newRules = rules.filter((_, i) => i !== ruleIndex);
            setDeletingRules(prev => prev.filter(i => i !== ruleIndex));

            // If this was the last rule, delete the entire group
            if (newRules.length === 0) {
                onRemoveGroup(groupIndex);
            } else {
                onUpdateGroup(groupIndex, { ...group, rules: newRules });
            }
        }, 300); // Match animation duration
    };

    const toggleRelation = () => {
        onUpdateGroup(groupIndex, { ...group, relation: relation === 'AND' ? 'OR' : 'AND' });
    };

    return (
        <div className={`advajra-rule-group ${isDeleting ? 'deleting' : ''}`}>
            {/* Group Header */}
            <div className="group-header">
                <div className={`group-relation-toggle mode-${relation.toLowerCase()}`} onClick={toggleRelation}>
                    <span className={`rel-option ${relation === 'AND' ? 'active' : ''}`}>AND</span>
                    <span className={`rel-option ${relation === 'OR' ? 'active' : ''}`}>OR</span>
                    <div className={`toggle-slider ${relation === 'AND' ? 'left' : 'right'}`}></div>
                </div>
                <span className="group-label">Match {relation === 'AND' ? 'ALL' : 'ANY'} of the following</span>
                {canRemove && (
                    <Button
                        isDestructive
                        isSmall
                        icon={trash}
                        onClick={() => onRemoveGroup(groupIndex)}
                        className="group-delete-btn"
                    />
                )}
            </div>

            {/* Rules */}
            <div className="group-rules">
                {rules.map((rule, ruleIndex) => {
                    const condition = availableConditions.find(c => c.id === rule.param);
                    const RuleIcon = getIconForType(rule.param);
                    const isDeleting = deletingRules.includes(ruleIndex);

                    return (
                        <div key={ruleIndex} className={`advajra-rule-card ${isDeleting ? 'deleting' : ''}`}>
                            <div className={`advajra-rule-icon type-${rule.param}`}>
                                <Icon icon={RuleIcon} size={24} />
                            </div>

                            <div className="advajra-rule-content">
                                <div className="flex-initial min-w-[160px]">
                                    <SmartSelect
                                        value={rule.param}
                                        options={availableConditions.map(c => ({ value: c.id, label: c.label }))}
                                        onChange={(newVal) => updateRule(ruleIndex, 'param', newVal)}
                                    />
                                </div>

                                {condition && (
                                    <div className="flex-initial min-w-[100px]">
                                        <SmartSelect
                                            value={rule.operator}
                                            options={Object.entries(condition.operators).map(([k, v]) => ({ value: k, label: v }))}
                                            onChange={(newVal) => updateRule(ruleIndex, 'operator', newVal)}
                                        />
                                    </div>
                                )}

                                {condition && (
                                    <div className="flex-1">
                                        {MULTI_SELECTABLE_TYPES.includes(rule.param) ? (
                                            <MultiSelect
                                                options={condition.options || []}
                                                value={Array.isArray(rule.value) ? rule.value : (rule.value ? [rule.value] : [])}
                                                onChange={(newVal) => updateRule(ruleIndex, 'value', newVal)}
                                                placeholder={`Select ${condition.label}...`}
                                            />
                                        ) : condition.options ? (
                                            <SmartSelect
                                                value={rule.value}
                                                options={Array.isArray(condition.options)
                                                    ? condition.options.map(opt => ({ value: opt, label: opt }))
                                                    : Object.entries(condition.options).map(([k, v]) => ({ value: k, label: v }))
                                                }
                                                onChange={(newVal) => updateRule(ruleIndex, 'value', newVal)}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                className="advajra-input px-3 py-2"
                                                value={rule.value}
                                                onChange={(e) => updateRule(ruleIndex, 'value', e.target.value)}
                                                placeholder="Enter value..."
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            <Button
                                isDestructive
                                icon={trash}
                                onClick={() => removeRule(ruleIndex)}
                                style={{ background: 'transparent', boxShadow: 'none', color: '#ef4444' }}
                            />
                        </div>
                    );
                })}

                {/* Add Rule Button */}
                <div className="group-add-rule" onClick={addRule}>
                    <Icon icon={plus} size={18} />
                    <span>Add Condition</span>
                </div>
            </div>
        </div>
    );
};

export default RuleGroup;
