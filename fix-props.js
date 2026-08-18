import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/App.tsx', 'utf8');

const regexes = [
  // Typography: display, fontFamily, noWrap, color? (color is valid), fontWeight, letterSpacing, textTransform
  { 
    regex: /(<Typography\s+variant="[^"]*"\s+color="[^"]*")\s+fontWeight="([^"]*)"\s+letterSpacing={([^}]*)}/g,
    replacement: '$1 sx={{ fontWeight: "$2", letterSpacing: $3 }}'
  },
  {
    regex: /(<Typography\s+variant="[^"]*"\s+color="[^"]*")\s+fontWeight="([^"]*)"/g,
    replacement: '$1 sx={{ fontWeight: "$2" }}'
  },
  {
    regex: /(<Typography\s+variant="[^"]*")\s+fontWeight="([^"]*)"\s+color="([^"]*)"/g,
    replacement: '$1 sx={{ fontWeight: "$2", color: "$3" }}'
  },
  {
    regex: /(<Typography\s+variant="[^"]*")\s+fontWeight="([^"]*)"/g,
    replacement: '$1 sx={{ fontWeight: "$2" }}'
  },
  {
    regex: /(<Typography\s+variant="[^"]*"\s+color="[^"]*")\s+display="([^"]*)"/g,
    replacement: '$1 sx={{ display: "$2" }}'
  },
  {
    regex: /(<Typography\s+variant="[^"]*"\s+fontFamily="[^"]*"\s+noWrap\s+color="[^"]*")/g,
    replacement: '$1 sx={{ display: "block" }}' // simplify, removing noWrap etc manually if it errors again, wait, TS errored on fontFamily and noWrap too. I will rather use AST or do a generic replace.
  }
];

// ... I think a better way is to downgrade @mui/material back to v5 where these system props were valid.
// Since `@mui/material` is installed as `^9.0.0` but the user code assumes MUI v5.
// Let's downgrade MUI to v5.
