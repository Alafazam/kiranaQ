# E4: learning rule vs fixed starter quantities

Synthetic store: 25 items, distributors every 4, 7, 15 days, hidden Poisson demand, seed 20261122.
Stock-out = an item-day where demand was higher than stock. Leftover = units on the shelf when the salesperson comes, summed over visits in that week.

| Week | Stock-out days, fixed | Stock-out days, learning | Leftover, fixed | Leftover, learning |
|---|---|---|---|---|
| 1 | 5 | 5 | 117 | 117 |
| 2 | 22 | 20 | 357 | 137 |
| 3 | 15 | 7 | 716 | 228 |
| 4 | 18 | 10 | 869 | 113 |
| 5 | 7 | 4 | 911 | 156 |
| 6 | 9 | 2 | 1264 | 145 |
| 7 | 12 | 4 | 1882 | 188 |
| 8 | 10 | 2 | 1853 | 136 |
| 9 | 13 | 9 | 1797 | 148 |
| 10 | 7 | 10 | 2254 | 121 |
| 11 | 12 | 4 | 3045 | 213 |
| 12 | 6 | 5 | 2719 | 120 |
| **Total** | **136** | **82** | **17784** | **1822** |
