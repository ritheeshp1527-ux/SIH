# Phase 6: Comparative Decision Analysis

> **Notice:** Phase 6 is a decision-analysis layer over existing optimization outputs. It does not create a new optimizer.

---

## 1. Overview & Objective

Phase 6 provides post-optimization decision intelligence by synthesizing outcomes from:
- **Phase 4**: Classical Exact Voyage Optimization (Deterministic Global Baseline)
- **Phase 5**: Quantum-Inspired QUBO + Simulated Annealing (Heuristic Global Exploration)

Rather than re-evaluating the physical vessel, route, and weather models, Phase 6 consumes pre-evaluated candidate records and answers the core operational question:

> **Which voyage option is best for a particular operational priority, and what trade-offs exist?**

All algorithmic terminology adheres strictly to scientific neutrality: **no quantum advantage, quantum superiority, or quantum speedup is claimed or demonstrated.**

---

## 2. Comparison Metrics & Formulation

For identical voyage optimization requests, Phase 6 calculates pairwise deltas between Quantum-Inspired Simulated Annealing ($QI$) and Classical Exact ($CL$):

$$\Delta = \text{Metric}_{QI} - \text{Metric}_{CL}$$

| Metric | Delta Formula | Unit / Representation | Neutral Operational Interpretation |
| :--- | :--- | :--- | :--- |
| **Cost Difference** | $\text{Cost}_{QI} - \text{Cost}_{CL}$ | USD (\$) | Additional financial expenditure (or savings if equal to optimum). |
| **Cost Percentage Diff** | $\frac{\text{Cost}_{QI} - \text{Cost}_{CL}}{\text{Cost}_{CL}} \times 100$ | $\%$ | Relative economic cost gap. |
| **Time Difference** | $\text{Time}_{QI} - \text{Time}_{CL}$ | Hours (h) | Difference in overall port-to-port voyage duration. |
| **Time Percentage Diff** | $\frac{\text{Time}_{QI} - \text{Time}_{CL}}{\text{Time}_{CL}} \times 100$ | $\%$ | Relative schedule duration gap. |
| **Fuel Difference** | $\text{Fuel}_{QI} - \text{Fuel}_{CL}$ | Tonnes (t) | Variance in total bunker fuel consumption. |
| **CO₂ Difference** | $\text{CO2}_{QI} - \text{CO2}_{CL}$ | Tonnes (t) | Variance in operational direct tailpipe combustion emissions. |
| **Lifecycle GHG Difference**| $\text{GHG}_{QI} - \text{GHG}_{CL}$ | Tonnes $\text{CO}_2\text{e}$ | Variance in Well-to-Wake lifecycle greenhouse gas impact. |
| **Deadline Margin Diff** | $\text{Margin}_{QI} - \text{Margin}_{CL}$ | Hours (h) | Impact on delivery deadline buffer ($\text{Deadline} - \text{Arrival}$). |
| **Runtime Difference** | $\text{Runtime}_{QI} - \text{Runtime}_{CL}$| Milliseconds (ms) | Algorithmic execution latency variance. |
| **Objective Gap** | Relative gap on primary objective | $\%$ | Proximity to classical global minimum under current objective mode. |

---

## 3. Pareto Dominance Analysis

Pareto dominance is calculated over the finite set of feasible candidates $\mathcal{F}$ using 5 simultaneous minimization criteria:

$$\vec{f}(c) = \big( \text{Cost}(c), \text{Time}(c), \text{Fuel}(c), \text{CO}_2(c), \text{GHG}(c) \big)$$

### Mathematical Definition of Dominance
Candidate $A$ dominates candidate $B$ ($A \succ B$) if and only if:
1. $f_k(A) \le f_k(B) \quad \forall k \in \{\text{Cost}, \text{Time}, \text{Fuel}, \text{CO}_2, \text{GHG}\}$
2. $\exists k \in \{\text{Cost}, \text{Time}, \text{Fuel}, \text{CO}_2, \text{GHG}\} \text{ such that } f_k(A) < f_k(B)$

The **Pareto Front** $\mathcal{P} \subseteq \mathcal{F}$ consists of all non-dominated candidates:
$$\mathcal{P} = \{ c \in \mathcal{F} \mid \nexists c' \in \mathcal{F} \text{ such that } c' \succ c \}$$

Duplicate objective vectors are deduplicated, and results are deterministically sorted by `(total_voyage_cost_usd, total_voyage_time_hours, decision_id)` to guarantee repeatable presentation.

---

## 4. Priority-Driven Selection

Operational dispatchers can select recommendations deterministically based on specialized priorities:

1. **Cost Priority (`cost`)**:
   $$\arg\min_{c \in \mathcal{P}} \big( \text{Cost}(c), \text{decision\_id} \big)$$
   Selects minimum total voyage financial expenditure.
2. **Time Priority (`time`)**:
   $$\arg\min_{c \in \mathcal{P}} \big( \text{Time}(c), \text{decision\_id} \big)$$
   Selects fastest transit duration and maximizes deadline safety margin.
3. **Fuel Priority (`fuel`)**:
   $$\arg\min_{c \in \mathcal{P}} \big( \text{Fuel}(c), \text{decision\_id} \big)$$
   Minimizes bunker fuel consumption in metric tons.
4. **Operational CO₂ Priority (`co2`)**:
   $$\arg\min_{c \in \mathcal{P}} \big( \text{CO}_2(c), \text{decision\_id} \big)$$
   Minimizes tailpipe combustion carbon dioxide emissions.
5. **Lifecycle GHG Priority (`ghg`)**:
   $$\arg\min_{c \in \mathcal{P}} \big( \text{GHG}(c), \text{decision\_id} \big)$$
   Minimizes total Well-to-Wake lifecycle emissions (CO₂e).

---

## 5. Transparent Balanced Recommendation

For operators seeking an equitable trade-off across all dimensions without choosing a single extreme priority:

### Step 1: Objective Normalization
For each objective $k \in \{\text{Cost}, \text{Time}, \text{Fuel}, \text{CO}_2, \text{GHG}\}$ over the Pareto front $\mathcal{P}$:
$$\min_k = \min_{c \in \mathcal{P}} f_k(c), \quad \max_k = \max_{c \in \mathcal{P}} f_k(c)$$
$$\tilde{f}_k(c) = \begin{cases} \frac{f_k(c) - \min_k}{\max_k - \min_k}, & \text{if } \max_k - \min_k > 10^{-6} \\ 0, & \text{otherwise} \end{cases}$$

### Step 2: Distance from Ideal Theoretical Point
The ideal theoretical point in normalized space is $(0, 0, 0, 0, 0)$. The aggregate Euclidean distance is:
$$D(c) = \sqrt{\sum_{k} \left( \tilde{f}_k(c) \right)^2}$$

### Step 3: Selection & Deterministic Tie-Breaking
The balanced voyage candidate is selected via:
$$c^* = \arg\min_{c \in \mathcal{P}} \big( D(c), \text{decision\_id} \big)$$

> **Design Assumption:** Equal weighting ($w_k = 1.0$) across the normalized objectives is a prototype decision-analysis assumption, avoiding arbitrary manual coefficient tuning (e.g. "30% cost + 30% fuel + 40% time").

---

## 6. Concrete Explanations & Schedule / Environmental Context

Explanations are dynamically constructed from candidate performance metrics rather than static boilerplates:
- Real dollar savings ($\$X$)
- Exact transit time ($Y$ hours)
- Fuel quantity ($Z$ tonnes)
- Emission totals ($W$ tonnes $\text{CO}_2$ / $\text{CO}_2\text{e}$)
- Exact deadline buffer margin ($M$ hours) and schedule safety classification (`Safe` if margin $> 5$h, `Tight` if $0 \le \text{margin} \le 5$h, `Infeasible` if $< 0$).

---

## 7. Assumptions and Limitations

1. **Layer Boundary:** Phase 6 is purely a post-optimization analysis and decision layer. It does not alter Phase 4 classical search or Phase 5 QUBO matrix generation.
2. **Deterministic Demonstration Network:** Routes, fuel indices, and weather segments utilize local deterministic fixture data.
3. **Finite Feasible Set:** Pareto analysis is bounded by the discrete combinations evaluated during candidate generation ($Vessel \times Route \times Speed \times Fuel$).
4. **Heuristic Nature:** The balanced recommendation distance formula is a decision-support heuristic, not a universal mathematical global optimum.
5. **No Quantum Advantage:** Quantum-inspired simulated annealing runs on classical CPU hardware and does not demonstrate computational quantum advantage.
