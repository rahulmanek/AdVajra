<?php
namespace AdVajra\Core\Targeting;

/**
 * Class TargetingEvaluator
 * Evaluates targeting rules using nested groups architecture.
 * Optimized for performance with short-circuit evaluation.
 */
class TargetingEvaluator {

	/**
	 * Evaluate the full targeting configuration.
	 *
	 * Supports both:
	 * - New format: { relation: 'AND', groups: [ { relation: 'AND', rules: [...] }, ... ] }
	 * - Legacy format: { relation: 'AND', rules: [...] }
	 *
	 * @param array $targeting The targeting configuration.
	 * @return bool True if targeting matches, false otherwise.
	 */
	public function evaluate( $targeting ) {
		if ( empty( $targeting ) ) {
			return true;
		}

		if ( isset( $targeting['groups'] ) && is_array( $targeting['groups'] ) ) {
			return $this->evaluate_groups( $targeting );
		}

		if ( isset( $targeting['rules'] ) && is_array( $targeting['rules'] ) ) {
			return $this->evaluate_group( $targeting );
		}

		return true;
	}

	/**
	 * Evaluate multiple groups with global relation.
	 *
	 * @param array $targeting { relation: 'AND'|'OR', groups: [...] }
	 * @return bool
	 */
	private function evaluate_groups( $targeting ) {
		$groups = $targeting['groups'];

		if ( empty( $groups ) ) {
			return true;
		}

		$global_relation = isset( $targeting['relation'] ) ? strtoupper( $targeting['relation'] ) : 'AND';

		foreach ( $groups as $group ) {
			$group_result = $this->evaluate_group( $group );

			if ( $global_relation === 'OR' && $group_result ) {
				return true;
			}

			if ( $global_relation === 'AND' && ! $group_result ) {
				return false;
			}
		}

		return $global_relation === 'AND';
	}

	/**
	 * Evaluate a single group (collection of rules).
	 *
	 * @param array $group { relation: 'AND'|'OR', rules: [...] }
	 * @return bool
	 */
	private function evaluate_group( $group ) {
		if ( empty( $group['rules'] ) ) {
			return true;
		}

		$relation = isset( $group['relation'] ) ? strtoupper( $group['relation'] ) : 'AND';

		foreach ( $group['rules'] as $rule ) {
			$rule_result = $this->evaluate_rule( $rule );

			if ( $relation === 'OR' && $rule_result ) {
				return true;
			}

			if ( $relation === 'AND' && ! $rule_result ) {
				return false;
			}
		}

		return $relation === 'AND';
	}

	/**
	 * Evaluate a single rule.
	 *
	 * @param array $rule { param, operator, value }
	 * @return bool
	 */
	private function evaluate_rule( $rule ) {
		if ( ! isset( $rule['param'], $rule['operator'], $rule['value'] ) ) {
			return true;
		}

		$registry  = TargetingRegistry::instance();
		$condition = $registry->get( $rule['param'] );

		if ( ! $condition ) {
			return true; // Unknown condition, ignore
		}

		return $condition->check( $rule['operator'], $rule['value'] );
	}
}
