import fs from 'fs';

let app = fs.readFileSync('App.tsx', 'utf8');

// Add import
app = app.replace(
  "import { ImageCheckView } from './src/components/ImageCheckView';",
  "import { ImageCheckView } from './src/components/ImageCheckView';\nimport { VideoQualityCheck } from './src/components/VideoQualityCheck';"
);

// Map paths
app = app.replace(
  "case 'aiqualitycheck': return ToolType.PROMPT_IMAGE_CHECK;",
  "case 'aiqualitycheck': return ToolType.PROMPT_IMAGE_CHECK;\n    case 'aivideoqualitycheck': return ToolType.PROMPT_VIDEO_CHECK;"
);

// Add to tool lists
app = app.replace(
  "ToolType.PROMPT_IMAGE_CHECK,",
  "ToolType.PROMPT_IMAGE_CHECK,\n      ToolType.PROMPT_VIDEO_CHECK,"
);

app = app.replace(
  "[ToolType.PROMPT_IMAGE_CHECK]: getDailyCount(ToolType.PROMPT_IMAGE_CHECK),",
  "[ToolType.PROMPT_IMAGE_CHECK]: getDailyCount(ToolType.PROMPT_IMAGE_CHECK),\n      [ToolType.PROMPT_VIDEO_CHECK]: getDailyCount(ToolType.PROMPT_VIDEO_CHECK),"
);

// Add render logic
const renderImageCheck = `          ) : activeTool === ToolType.PROMPT_IMAGE_CHECK ? (
            <ImageCheckView 
              t={t} 
              aiOptions={aiOptions} 
              isLicensed={isLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_IMAGE_CHECK] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.PROMPT_IMAGE_CHECK, amount)}
              setShowLimitModal={setShowLimitModal}
            />`;

const renderVideoCheck = `          ) : activeTool === ToolType.PROMPT_IMAGE_CHECK ? (
            <ImageCheckView 
              t={t} 
              aiOptions={aiOptions} 
              isLicensed={isLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_IMAGE_CHECK] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.PROMPT_IMAGE_CHECK, amount)}
              setShowLimitModal={setShowLimitModal}
            />
          ) : activeTool === ToolType.PROMPT_VIDEO_CHECK ? (
            <VideoQualityCheck 
              t={t} 
              aiOptions={aiOptions} 
              isLicensed={isLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_VIDEO_CHECK] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.PROMPT_VIDEO_CHECK, amount)}
              setShowLimitModal={setShowLimitModal}
            />`;

app = app.replace(renderImageCheck, renderVideoCheck);

fs.writeFileSync('App.tsx', app);
