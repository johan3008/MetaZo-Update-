import fs from 'fs';

let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const desktopNav = `            <a href={toolToPath[ToolType.PROMPT_IMAGE_CHECK]} onClick={(e) => handleNavClick(e, ToolType.PROMPT_IMAGE_CHECK)}
              className={\`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all duration-200 \${
                activeTool === ToolType.PROMPT_IMAGE_CHECK 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white active:scale-95 border-l-4 border-violet-500" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }\`}
            >
              <CheckCircle size={16} className={activeTool === ToolType.PROMPT_IMAGE_CHECK ? "text-emerald-400" : "text-slate-400"} />
              {!sidebarCollapsed && <span>{t.sidebar_image_check}</span>}
            </a>
            <a href={toolToPath[ToolType.PROMPT_VIDEO_CHECK]} onClick={(e) => handleNavClick(e, ToolType.PROMPT_VIDEO_CHECK)}
              className={\`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all duration-200 \${
                activeTool === ToolType.PROMPT_VIDEO_CHECK 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white active:scale-95 border-l-4 border-violet-500" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }\`}
            >
              <CheckCircle size={16} className={activeTool === ToolType.PROMPT_VIDEO_CHECK ? "text-emerald-400" : "text-slate-400"} />
              {!sidebarCollapsed && <span>Cek Quality Video</span>}
            </a>`;

const mobileNav = `                    <button 
                      onClick={() => { setActiveTool(ToolType.PROMPT_IMAGE_CHECK); setSidebarOpen(false); }}
                      className={\`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all \${
                        activeTool === ToolType.PROMPT_IMAGE_CHECK 
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-l-4 border-violet-500" 
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }\`}
                    >
                      <CheckCircle size={14} className={activeTool === ToolType.PROMPT_IMAGE_CHECK ? "text-emerald-400" : "text-slate-400"} />
                      <span>{t.sidebar_image_check}</span></button>
                    <button 
                      onClick={() => { setActiveTool(ToolType.PROMPT_VIDEO_CHECK); setSidebarOpen(false); }}
                      className={\`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all \${
                        activeTool === ToolType.PROMPT_VIDEO_CHECK 
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-l-4 border-violet-500" 
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }\`}
                    >
                      <CheckCircle size={14} className={activeTool === ToolType.PROMPT_VIDEO_CHECK ? "text-emerald-400" : "text-slate-400"} />
                      <span>Cek Quality Video</span></button>`;

sidebar = sidebar.replace(/<a href=\{toolToPath\[ToolType.PROMPT_IMAGE_CHECK\]\}[\s\S]*?<\/a>/, desktopNav);
sidebar = sidebar.replace(/<button \n                      onClick=\{\(\) => \{ setActiveTool\(ToolType.PROMPT_IMAGE_CHECK\); setSidebarOpen\(false\); \}\}[\s\S]*?<\/button>/, mobileNav);

fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
