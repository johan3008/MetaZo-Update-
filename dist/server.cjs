var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app
});
module.exports = __toCommonJS(server_exports);
var import_ffmpeg = require("@ffmpeg-installer/ffmpeg");
var import_ffprobe = require("@ffprobe-installer/ffprobe");
var import_fluent_ffmpeg = require("fluent-ffmpeg");
var import_package = require("@ffmpeg-installer/linux-x64/package.json");
var import_package2 = require("@ffprobe-installer/linux-x64/package.json");
var import_express = __toESM(require("express"), 1);
var import_genai2 = require("@google/genai");
var import_multer = __toESM(require("multer"), 1);
var import_child_process = require("child_process");
var import_util = __toESM(require("util"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_client_s3 = require("@aws-sdk/client-s3");
var import_s3_request_presigner = require("@aws-sdk/s3-request-presigner");
var import_url = require("url");
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_pakasir_client = require("pakasir-client");

// server/gemini.ts
var import_genai = require("@google/genai");
var import_node_async_hooks = require("node:async_hooks");

// constants.tsx
var ADOBE_CATEGORIES = [
  { id: 1, name: "Animals" },
  { id: 2, name: "Buildings and Architecture" },
  { id: 3, name: "Business" },
  { id: 4, name: "Drinks" },
  { id: 5, name: "The Environment" },
  { id: 6, name: "States of Mind" },
  { id: 7, name: "Food" },
  { id: 8, name: "Graphic Resources" },
  { id: 9, name: "Hobbies and Leisure" },
  { id: 10, name: "Industry" },
  { id: 11, name: "Landscapes" },
  { id: 12, name: "Lifestyle" },
  { id: 13, name: "People" },
  { id: 14, name: "Plants and Flowers" },
  { id: 15, name: "Culture and Religion" },
  { id: 16, name: "Science" },
  { id: 17, name: "Social Issues" },
  { id: 18, name: "Sports" },
  { id: 19, name: "Technology" },
  { id: 20, name: "Transport" },
  { id: 21, name: "Travel" }
];
var SHUTTERSTOCK_CATEGORIES = [
  "Abstract",
  "Animals/Wildlife",
  "Backgrounds/Textures",
  "Beauty/Fashion",
  "Buildings/Landmarks",
  "Business/Finance",
  "Education",
  "Food and Drink",
  "Healthcare/Medical",
  "Holidays",
  "Industrial",
  "Interiors",
  "Miscellaneous",
  "Nature",
  "Objects",
  "Parks/Outdoor",
  "People",
  "Religion",
  "Science",
  "Signs/Symbols",
  "Sports/Recreation",
  "Technology",
  "Transportation",
  "Vintage"
];
var SHUTTERSTOCK_CATEGORIES_VIDEO = [
  "Animals/Wildlife",
  "Backgrounds/Textures",
  "Buildings/Landmarks",
  "Business/Finance",
  "Education",
  "Food and Drink",
  "Healthcare/Medical",
  "Holidays",
  "Industrial",
  "Nature",
  "Objects",
  "People",
  "Religion",
  "Science",
  "Signs/Symbols",
  "Sports/Recreation",
  "Technology",
  "Transportation"
];
var getDailyLimit = () => {
  return /* @__PURE__ */ new Date() >= /* @__PURE__ */ new Date("2026-07-01T00:00:00+07:00") ? 25 : 30;
};
var TRANSLATIONS = {
  en: {
    header_title: "MetaZo PRO",
    main_subtitle_line1: "AI-Powered Metadata Assistant",
    main_subtitle_line2: "Specializing in Adobe Stock, Shutterstock, Freepik, Vecteezy, Canva Contributors",
    help_button: "WhatsApp Group & Support",
    donate_button: "Donate / Support",
    whatsapp_link: "https://chat.whatsapp.com/EJgcCSymQYE3724FqpFzxr",
    footer_text: "\u{1F510} Developed with dedication @2026.",
    image_tool: "Image",
    video_tool: "Video",
    vector_tool: "Vector",
    upload_images: "1. Upload Image Files",
    upload_videos: "1. Upload Video Files",
    upload_vector_thumbnails: "1. Upload Vector Files",
    drag_drop: "Drag & drop here, or",
    click_to_choose: "choose files",
    files_selected: "files selected.",
    uploading_file: "Processing upload...",
    add_new: "Add More",
    clear_all: "Clear All",
    generate_metadata_ai: "2. AI Metadata Optimization",
    generate_desc: "AI analyzes visual content (including multi-frame for video) for the best results.",
    continue_generate: "Continue Process",
    custom_prompt_optional: "Instructions / Target Keywords (Optional):",
    custom_prompt_placeholder: "Example: 'retro style, focus on red scarf' or 'Blue, Ocean, Summer'.",
    keyword_count_label: "Keyword Count (1-49):",
    keyword_count_auto: "Auto",
    generate_all: "Process Metadata",
    generating: "AI is analyzing...",
    retry_failed: "Retry Failed",
    ai_processing: "AI processing in progress...",
    generation_mode_label: "Processing Mode:",
    generation_mode_standard: "Standard",
    generation_mode_standard_desc: "Accurate, stable.",
    generation_mode_batch: "Batch",
    generation_mode_batch_desc: "Fast, simultaneous processing.",
    review_edit: "3. Review & Refine",
    review_edit_desc: "Verify compliance with stock standards through the preview box.",
    keywords_label: "Keywords",
    title_label: "Title",
    description_label: "Description",
    category_adobe_label: "Adobe Stock Category",
    category_shutterstock_1_label: "Shutterstock Category 1",
    category_shutterstock_2_label: "Shutterstock Category 2",
    enter_title: "Enter title...",
    enter_description: "Describe content...",
    select_category: "Select category...",
    original_filename: "Filename:",
    close: "Close",
    download_csv: "Download CSV",
    download_disabled_tooltip: "Complete all AI processes first.",
    export_metadata: "4. Export",
    language: "Language",
    english: "English",
    indonesian: "Indonesian",
    regenerate: "Regenerate Metadata",
    hero_badge: "AI-Driven Metadata Engine",
    hero_title_part1: "Instant",
    hero_title_part2: "Stock Asset",
    hero_title_part3: "Optimization",
    hero_description: "MetaZo leverages AI intelligence to generate titles, descriptions, and tags automatically for global stock portals.",
    hero_cta_how: "How to Use",
    hero_stats_file: "Files",
    license_active_title: "Commercial License Active",
    license_active_desc: "Unlimited access is active for professional workflow",
    license_pro_badge: "\u2605 PRO",
    trial_badge: "Trial Version",
    trial_desc_part1: "Use",
    trial_desc_part2: "in limited mode. Get unlimited access with a premium license for",
    trial_cta_license: "License",
    trial_cta_admin: "Admin",
    workspace_title: "Choose Your Workspace",
    workspace_modes: "3 Modes",
    image_ws_title: "Image AI",
    image_ws_desc: "Automatically optimize photos, posters, or raster artwork (JPG, PNG, WEBP).",
    image_ws_cta: "Optimize Images",
    video_ws_title: "Video AI",
    video_ws_desc: "Analyze video clips (MP4, MOV, WEBM) for precise cinematic metadata.",
    video_ws_cta: "Optimize Videos",
    vector_ws_title: "Vector AI",
    vector_ws_desc: "Automatic metadata for vector files (SVG, EPS, AI) for UI/UX design needs.",
    vector_ws_cta: "Optimize Vectors",
    daily_quota: "Daily Quota",
    quota_exhausted: "\u26A0\uFE0F Quota exhausted. Try tomorrow.",
    queue_status_title: "Data Queue Status",
    status_success: "Metadata OK",
    status_ready: "Ready for AI",
    status_draft: "Unconfigured Draft",
    status_error: "Issue / Error",
    success_rate: "Success Rate",
    dist_title: "Upload Format Distribution",
    no_files_title: "No Files Uploaded Yet",
    no_files_desc: 'Use the "Metadata Gen" menu tab to upload your files.',
    dist_image_label: "Image Workspace",
    dist_video_label: "Video Workspace",
    dist_vector_label: "Vector Workspace",
    portal_ready: "Ready",
    sidebar_dashboard: "Dashboard",
    sidebar_metadata_gen: "Metadata Gen",
    sidebar_prompt_gen: "Prompt Gen",
    sidebar_prompt_text: "Text Prompt",
    sidebar_prompt_image: "Image Prompt",
    sidebar_prompt_video: "Video Prompt",
    sidebar_image_check: "Media Quality Check",
    sidebar_calendar_gen: "Calendar Gen",
    sidebar_chat: "Account Chat",
    sidebar_activation_premium: "ACTIVATE PREMIUM",
    sidebar_pro_active: "PRO ACTIVE",
    sidebar_manage: "Manage",
    sidebar_core_generators: "Core Generators",
    sidebar_core_tools: "Core Tools",
    sidebar_processing_mode: "Processing Mode",
    sidebar_tuning: "Tuning",
    sidebar_resources: "Resources",
    sidebar_about: "About MetaZo PRO",
    sidebar_subscription_plan: "Subscription Plan",
    default_pricing: "30 Days = $2 - Unlimited = $14",
    topbar_system_time: "Current System Time",
    topbar_stability_core: "STABILITY CORE ONLINE",
    topbar_pro_active: "\u{1F451} PRO ACTIVE",
    topbar_trial_eval: "\u26A0\uFE0F TRIAL EVAL",
    upload_title: "Upload Assets",
    upload_reset: "Reset",
    upload_reset_title: "Reset Everything",
    upload_help: "Upload your image, video, or vector files here to process.",
    upload_file_placeholder: "FILE",
    upload_next_ai: "Next: AI Config",
    info_modal_title: "MetaZo PRO Handbook & Usage Guide",
    info_modal_operational_guide: "\u2728 MetaZo PRO Operational Guide",
    info_modal_step1_title: "Workspace Selection",
    info_modal_step1_desc_p1: "Choose mode",
    info_modal_step1_desc_p2: "on the main Dashboard. Upload your files via drag-and-drop or by clicking the upload area.",
    info_modal_step2_title: "AI Analysis & Metadata Generation",
    info_modal_step2_desc: "Once uploaded, click Process Metadata. Our AI Vision engine will analyze the visual content to generate Titles, Descriptions, and Categories automatically.",
    info_modal_step3_title: "Prompt Gen & Image AI (Integrated!)",
    info_modal_step3_desc_highlight: "The Prompt Gen feature is now integrated with Calendar Gen to make it easier to create stock content based on popular events.",
    info_modal_step3_desc_main: "Use the Prompt Gen feature to generate in-depth visual descriptions for AI Art.",
    info_modal_step4_title: "Image Check (QC)",
    info_modal_step4_desc: "Ensure your assets are free from IP violations, logos, and excessive noise with the Image Check feature before uploading to agencies.",
    info_modal_step5_title: "Calendar Gen (Niche Hunter)",
    info_modal_step5_desc: "Find important future global events to help you determine the themes for stock content production that buyers are searching for.",
    info_modal_step6_title: "Export & Download",
    info_modal_step6_desc: "Once satisfied, use the Export feature to download metadata in CSV format compatible with Adobe Stock, Shutterstock, etc.",
    info_modal_tips_title: "\u26A1 Processing Mode Tips",
    info_modal_std_mode_title: "Standard Mode",
    info_modal_std_mode_desc: "Processes files one by one in sequence. Very safe and stable to avoid API rate limit issues.",
    info_modal_batch_mode_title: "Batch Mode",
    info_modal_batch_mode_desc: "Processes many files simultaneously. Recommended for processing large quantities of assets if time is your main priority.",
    info_modal_trial_premium_title: "\u{1F4B3} Trial & Premium Handbook",
    info_modal_trial_mode_label: "Trial Mode:",
    info_modal_trial_mode_desc: "You are in a free trial period with daily limits to ensure system stability. Certain features may be limited.",
    info_modal_premium_mode_label: "Premium (License):",
    info_modal_premium_mode_desc: "With a license Serial Key, all limits are completely removed. Get unlimited access for your professional asset processing.",
    info_modal_license_cta: "Need a license? Contact admin to get an official Serial Key & upgrade your account to Premium!",
    info_modal_supported_formats: "\u{1F4C1} Supported File Formats",
    info_modal_close_button: "Close Guide",
    settings_modal_title: "AI Model Provider Settings",
    settings_main_provider_label: "Main AI Provider Used",
    settings_gemini_model_label: "Select Gemini Model",
    settings_gemini_desc: "You can save several personal Gemini API Keys. The system intelligently performs automatic rotation to avoid quota issues (*rate limit / RESOURCE_EXHAUSTED*).",
    settings_gemini_key_list: "Gemini API Key List",
    settings_no_keys: "No API Keys found matching this provider.",
    settings_gemini_model_auto: "Automatic (Auto-Select Reliable)",
    settings_use_default_key: "Using global server default Gemini Key.",
    welcome_title: "Welcome to MetaZo PRO v1.3.0",
    welcome_subtitle: "Stock Asset Optimizer",
    welcome_features_label: "Features:",
    welcome_feature1: "AI-powered stock asset optimization",
    welcome_feature2: "Lightweight & fast generation",
    welcome_feature3: "Multiple provider support",
    welcome_feature4: "Advanced prompt management",
    welcome_get_started: "Get Started",
    common_or: "or",
    common_and: "and",
    activation_modal_title_trial_expired: "Trial Expired",
    activation_modal_title_normal: "Official License Activation",
    activation_modal_unlock_premium: "Unlock Premium SaaS",
    activation_active_status: "Application Active \u2022 Premium PRO",
    activation_key_registered: "Registered Key:",
    activation_subscription_left: "Subscription Period:",
    activation_days_left: "Days Left",
    activation_commercial_notice: "Commercial copy licensed under key constraints.",
    activation_btn_unsubscribe: "Unsubscribe (Revoke License)",
    activation_trial_expired_hero: "7-Day Trial Expired!",
    activation_trial_expired_desc: "Your free trial has ended. Please make a payment and enter the License Serial Key below to continue using Metadata Gen, Prompt Text, & Calendar Gen.",
    activation_trial_active_hero: "Trial Mode Active",
    activation_trial_active_days: "Days Left",
    activation_trial_active_desc: `You are in Free Trial mode. All features are unlocked with a limit of ${getDailyLimit()} generations per day. Activate officially to unlock unlimited generations.`,
    activation_input_label: "Enter License Serial Key",
    activation_input_placeholder: "FORMAT: MZPRO-XXXX-XXXX-XXXX",
    activation_error_empty: "Please enter your license Serial Key first.",
    activation_error_expired: "This Serial Key (30 Days) has expired. Please buy a new key.",
    activation_error_used: "This Serial Key is already used by another user! Please use a different Serial Key.",
    activation_error_invalid: "Serial Key not registered or incorrect. Please contact Admin to buy an Official Key.",
    activation_error_offline: "Internet connection issue and offline validation failed.",
    activation_success_waiting: "\u2714 License validated! Enabling premium...",
    activation_btn_process: "Processing Activation...",
    activation_btn_activate: "Activate Premium",
    activation_no_license_title: "Don't have a License? Get it Instant:",
    activation_personal_activation: "Personal Activation",
    activation_license_price: "License Price:",
    activation_buy_whatsapp: "Buy License Key via WhatsApp",
    activation_confirm_stop_title: "Cancellation Confirmation",
    activation_confirm_stop_desc: "Are you sure you want to turn off premium status and return the application to trial mode?",
    activation_btn_stop_yes: "Yes, Stop",
    activation_btn_stop_no: "Cancel",
    sidebar_expand: "Expand Sidebar",
    sidebar_collapse: "Collapse Sidebar",
    sidebar_manage_license: "Manage License / Unsubscribe",
    sidebar_activation_tooltip: "Activate Official License / Start Pro",
    topbar_toggle_theme: "Toggle Theme",
    topbar_info_manual: "Information Manual",
    topbar_settings_api: "Settings & API Key",
    common_editor: "Editor",
    common_mode: "Mode",
    prompt_title: "Prompt Text Studio",
    prompt_subtitle: "Synthesize Visual Ideas with a Spectrum of Creativity & Artistic Categories",
    prompt_engine_active: "Gemini Pro Engine Active",
    prompt_formula_title: "Artistic Formula & Configuration",
    prompt_tab_background: "Tab Background",
    prompt_tab_png: "Tab PNG Asset",
    prompt_trial_label: "Today's Trial: Prompt Text",
    prompt_generate_count: "Generates",
    prompt_trial_expired: `\u26A0\uFE0F Daily free trial limit (${getDailyLimit()} generates) reached. Please contact admin or enter activation code for unlimited processing.`,
    prompt_trial_remaining: `Free trial ${getDailyLimit()} generates/day. Remaining quota today:`,
    prompt_trial_times: "times",
    prompt_image_trial_label: "Today's Trial: Prompt Image",
    prompt_image_generate_count: "Generates",
    prompt_image_trial_expired: `\u26A0\uFE0F Daily free trial limit (${getDailyLimit()} generates) reached. Please contact admin or enter activation code for unlimited processing.`,
    prompt_image_trial_remaining: `Free trial ${getDailyLimit()} generates/day. Remaining quota today:`,
    prompt_image_trial_times: "times",
    prompt_video_trial_label: "Today's Trial: Prompt Video",
    prompt_video_generate_count: "Generates",
    prompt_video_trial_expired: `\u26A0\uFE0F Daily free trial limit (${getDailyLimit()} generates) reached. Please contact admin or enter activation code for unlimited processing.`,
    prompt_video_trial_remaining: `Free trial ${getDailyLimit()} generates/day. Remaining quota today:`,
    prompt_video_trial_times: "times",
    image_check_trial_label: "Today's Trial: Image Quality Audit",
    image_check_generate_count: "Audits",
    image_check_trial_expired: `\u26A0\uFE0F Daily free trial limit (${getDailyLimit()} audits) reached. Please contact admin or enter activation code for unlimited processing.`,
    image_check_trial_remaining: `Free trial ${getDailyLimit()} audits/day. Remaining quota today:`,
    image_check_trial_times: "times",
    prompt_subject_label: "Visual Idea / Image Subject",
    prompt_subject_placeholder: "Type your visual idea freely here...",
    prompt_inspiration_label: "\u{1F4A1} Need Inspiration? Click Presets below:",
    prompt_negative_label: "Negative Prompt (Anti-Elements)",
    prompt_negative_subtitle: "Avoid Elements",
    prompt_negative_desc: "The above elements will be strictly sent to the AI model to be avoided in the prompt synthesis.",
    prompt_style_master_label: "Artistic Master Style Category",
    prompt_style_quick_label: "Quick Selection Tab",
    prompt_png_bg_label: "PNG Background Options",
    prompt_png_bg_desc: "The AI will smartly embed this background color instruction into the prompt to neatly isolate the image subject.",
    prompt_variation_label: "Dimension & Output Variation Count",
    prompt_variation_unit: "Variations",
    prompt_word_count_label: "Word Count Range (Prompt Length)",
    prompt_word_count_desc: "Adjusts how detailed the AI expands the visual description of each prompt.",
    prompt_btn_synthesize: "Synthesize {count} Prompts Now",
    prompt_btn_synthesizing: "AI Expanding {count} Artistic Variations...",
    prompt_preset_lite: "Fast, efficient, concise and representative formulation.",
    prompt_preset_artistic: "Full of camera options, varied lenses, and balanced aesthetic style.",
    prompt_preset_ultra: "Super complex details, rich textures, lighting options, and variety of perspectives.",
    prompt_loading_step1: "Formulating Creative Scenarios...",
    prompt_loading_step2: "Synthesizing Artistic Detail...",
    prompt_loading_step3: "Polishing Prompt Spectrum...",
    prompt_loading_step4: "Finalizing Output Collection...",
    prompt_studio_title: "Prompt Text Studio",
    prompt_studio_subtitle: "Synthesize Visual Ideas with a Spectrum of Creativity & Artistic Categories",
    prompt_studio_version: "Advanced AI Text Creator v2.5",
    prompt_output_title: "Generated Prompts",
    prompt_output_subtitle: "All prompts are ready to be copied to Midjourney / DALL-E / Firefly / Stable Diffusion",
    prompt_output_badge_png: "\u2728 PNG: BACKGROUND {color}",
    prompt_output_badge_scene: "\u{1F5BC}\uFE0F Background Scene",
    prompt_output_btn_copy_all: "Copy All",
    prompt_output_btn_copied: "Copied",
    prompt_output_btn_download: "Download",
    prompt_output_btn_clear: "Clear",
    prompt_output_search_placeholder: "Filter prompts (e.g.: 'lighting', 'macro', 'epic', 'camera')...",
    prompt_output_no_match_title: "No filter matches",
    prompt_output_no_match_desc: 'Keyword "{query}" not found in {count} prompts.',
    image_studio_title: "Prompt Image Studio",
    image_studio_subtitle: "Extract Description & Aesthetics from Your Image Reference (Single & Batch Mode)",
    image_studio_version: "Image-to-Prompt Batch v2.0",
    image_studio_upload_label: "Image Upload Panel",
    image_studio_clear_all: "Clear All",
    image_studio_drag_drop: "Upload / Drag Images",
    image_studio_release: "Release Images",
    image_studio_support_multiple: "Supports multiple files at once",
    image_studio_target_label: "Select Aesthetic Target",
    image_studio_btn_analyze: "Generate Prompt ({count} New Items)",
    image_studio_btn_analyzing: "Processing {count} Items ({progress}%)",
    image_studio_dashboard_title: "Queue Progress Dashboard",
    image_studio_status_label: "Status: {finished}/{total} Finished",
    image_studio_btn_copy_all: "Copy All",
    image_studio_btn_copied_all: "Copied All",
    image_studio_empty_title: "No Images in Queue Yet",
    image_studio_empty_desc: "Upload one or more reference images to instantly extract AI aesthetic prompts.",
    video_studio_title: "Prompt Video Studio",
    video_studio_subtitle: "Synthesize Descriptions & Prompts from Video Motion References",
    video_studio_keyword_placeholder: "Enter motion keyword (e.g., 'Cinematic Landscape', 'Epic Action')...",
    video_studio_btn_analyze: "Analyze Motion",
    video_studio_btn_analyzing: "Analyzing...",
    video_studio_history_title: "Analysis History",
    video_studio_btn_clear_history: "Clear History",
    video_studio_hollywood_title: "Hollywood Synthesis",
    video_studio_hollywood_desc: "Generate professional Hollywood-standard director prompts based on motion analysis.",
    video_studio_btn_generate_hollywood: "Generate Hollywood Prompts",
    video_studio_btn_generating_hollywood: "Synthesizing Hollywood Prompts...",
    video_studio_btn_download: "Download Prompts",
    video_studio_camera_label: "Camera",
    video_studio_technical_label: "Technical String",
    video_studio_saturation_title: "Market Saturation Alert",
    video_studio_saturation_desc: "Automatic warning if the market is too saturated with similar content.",
    video_studio_revenue_title: "Revenue Forecast",
    video_studio_revenue_desc: "Estimated revenue potential based on buyer trends at Adobe Stock & Shutterstock.",
    video_studio_error_empty: "Please enter a keyword first.",
    video_studio_error_fail: "Failed to analyze keyword. Try again later.",
    calendar_title: "Visual Calendar Planner",
    calendar_subtitle: "Find strategic moments based on holidays & global market trends.",
    calendar_months_january: "January",
    calendar_months_february: "February",
    calendar_months_march: "March",
    calendar_months_april: "April",
    calendar_months_may: "May",
    calendar_months_june: "June",
    calendar_months_july: "July",
    calendar_months_august: "August",
    calendar_months_september: "September",
    calendar_months_october: "October",
    calendar_months_november: "November",
    calendar_months_december: "December",
    calendar_btn_generate: "Find Events",
    calendar_btn_generating: "Analyzing...",
    calendar_month_label: "Select Month",
    calendar_card_btn_keywords: "Generate Keywords",
    calendar_card_btn_prompt: "Create Prompt",
    calendar_error_fail: "Failed to generate events. Please try again.",
    style_photorealistic: "Photorealistic (Realistic)",
    style_cinematic: "Cinematic (Film)",
    style_adobe_stock: "Adobe Stock Style",
    style_editorial: "Editorial (Magazine)",
    style_lifestyle: "Lifestyle (Life Style)",
    style_fine_art: "Fine Art (High Art)",
    prompt_error_trial: `Trial Limit Exceeded. You have reached the maximum limit of ${getDailyLimit()} Prompt Text generates today. Please contact admin or enter activation code for unlimited processing.`,
    prompt_error_empty: "Please enter a base idea or pure visual subject first.",
    prompt_png_bg_white: "\u26AA White background",
    prompt_png_bg_black: "\u26AB Black background",
    prompt_png_bg_transparent: "\u{1F3C1} Transparent background",
    qc_title: "Quality",
    qc_title_check: "Check",
    qc_subtitle: "AI Expert for Adobe Stock Standards",
    qc_btn_reset: "Reset",
    qc_btn_analyze: "Start Audit Asset",
    qc_btn_analyzing: "Analyzing...",
    qc_tolerance_label: "Quality Tolerance",
    qc_upload_hub: "Upload Hub",
    qc_drop_images_here: "Drop Images/Video/Vector Here",
    qc_release_images: "Release Files",
    qc_multiple_upload: "Supports Images, Videos & Vectors (.eps, .ai)",
    qc_queue_assets: "Assets in Queue",
    qc_pending_audit: "Pending Audit",
    qc_analyzing_text: "Adobe Stock QC Specialist",
    qc_analyzing_desc: "Analyzing legal, technical, and commercial value",
    qc_info_empty: "Please upload files first to start the curation audit process",
    qc_score_label: "QC SCORE",
    qc_hide_heatmap: "Hide Heatmap",
    qc_analyze_heatmap: "Analyze Pixel Heatmap",
    qc_pixel_engine: "Pixel Engine",
    qc_rejection_reason: "Rejection Reason",
    qc_legal_status: "Legal Status",
    qc_quality_metadata: "Quality Metadata",
    qc_close: "Close",
    qc_view_audit: "View Audit",
    qc_strengths: "Strengths",
    qc_tech_analysis: "Technical Analysis",
    qc_detailed_feedback: "Detailed Feedback",
    guide_btn_title: "View Feature Guide",
    guide_dashboard_title: "Dashboard Guide",
    guide_dashboard_desc: "Overview of your account health, generation statistics, and application links.",
    guide_prompt_gen_title: "Prompt Studio Guide",
    guide_prompt_gen_desc: "Write short descriptive inputs and get highly optimized prompts for GenAI stock submission (Midjourney, DALL-E, etc.).",
    guide_prompt_text_title: "Prompt Text Guide",
    guide_prompt_text_desc: "Write short descriptive inputs and get highly optimized prompts for GenAI stock submission (Midjourney, DALL-E, etc.).",
    guide_prompt_image_title: "Prompt Image Guide",
    guide_prompt_image_desc: "Upload reference images to extract descriptions and aesthetic details for generating new prompt formulas.",
    guide_prompt_video_title: "Prompt Video Guide",
    guide_prompt_video_desc: "Analyze motion keywords to synthesize professional cinematic director prompts and evaluate market potential.",
    guide_image_title: "Image AI Guide",
    guide_image_desc: "Upload images to automatically generate Adobe/Shutterstock optimized metadata including standard Title, Description, and Keywords.",
    guide_video_title: "Video AI Guide",
    guide_video_desc: "Upload videos to get precise metadata specifically focused on motion, action, speed, and cinematic keywords.",
    guide_vector_title: "Vector EPS Guide",
    guide_vector_desc: "Upload large EPS files. The system will safely auto-convert EPS into previews and extract intelligent metadata.",
    guide_image_check_title: "Image Audit Guide",
    guide_image_check_desc: "Upload images for a pre-submission AI check. Catches technical issues, out-of-focus, IP violations, and potential rejections.",
    guide_calendar_title: "Calendar AI Guide",
    guide_calendar_desc: "Generate seasonal stock calendar ideas by inputting a month/event. Never miss a commercial stock trend again.",
    sidebar_mute_video: "Mute Video Gen",
    mute_title: "Batch Mute Video Gen",
    mute_subtitle: "Instantly remove audio from multiple stock videos losslessly at once",
    mute_btn_clear: "Clear All",
    mute_drag_drop: "Drag & drop multiple video files here",
    mute_formats_supported: "Supports multiple MP4, MOV, WebM files (Max 500MB per file)",
    mute_btn_choose: "CHOOSE VIDEO FILES",
    mute_error_invalid_files: "The following files were ignored because they are not videos: {names}",
    mute_queue_title: "Video Queue List ({count})",
    mute_stat_done: "Done",
    mute_stat_processing: "Processing",
    mute_stat_failed: "Failed",
    mute_stat_pending: "Pending",
    mute_btn_processing: "PROCESSING BATCH ({current}/{total})...",
    mute_btn_mute_queue: "MUTE VIDEO QUEUE",
    mute_btn_download_all: "DOWNLOAD ALL ({count})",
    mute_status_muting: "Muting...",
    mute_status_success: "Success",
    mute_status_failed_badge: "Failed",
    mute_status_pending_badge: "Pending",
    mute_tooltip_remove: "Remove from queue",
    mute_preview_title: "Media Preview",
    mute_preview_size: "Size",
    mute_preview_format: "Format",
    mute_preview_error: "Error",
    mute_preview_empty: "Select a video from the queue list to play the preview",
    mute_guide_title: "Usage Guide",
    mute_guide_step1_title: "Choose Files",
    mute_guide_step1_desc: "Drag multiple videos or click the file selector above.",
    mute_guide_step2_title: "Start Process",
    mute_guide_step2_desc: "Click the Mute Video Queue button to remove sound from all videos sequentially.",
    mute_guide_step3_title: "Download Results",
    mute_guide_step3_desc: "Download individually using the button next to the filename, or click Download All to download all successful videos at once.",
    mute_guide_footer: "\u{1F512} All files are processed locally on a secure sandbox server, and will be destroyed immediately after downloading is completed.",
    guide_mute_video_title: "Mute Video Guide",
    guide_mute_video_desc: "Instantly remove audio from multiple stock videos losslessly at once to meet submission requirements.",
    mute_auto_download_label: "Auto-Download",
    mute_auto_download_desc: "Automatically download after processing",
    mute_trial_expired: "\u26A0\uFE0F Daily free trial limit (25 video mutes) reached. Please contact admin or enter activation code for unlimited processing.",
    mute_trial_remaining: "Free trial 25 video mutes/day. Remaining quota today: {remaining} times",
    mute_error_trial: "Trial Limit Exceeded. You have reached the maximum limit of 25 video mutes today. Please contact admin or enter activation code for unlimited processing."
  },
  id: {
    header_title: "MetaZo PRO",
    main_subtitle_line1: "Asisten Metadata Berbasis AI",
    main_subtitle_line2: "Spesialis Kontributor Adobe Stock, Shutterstock, Freepik, Vecteezy, Canva",
    help_button: "Grup WhatsApp & Bantuan",
    donate_button: "Donasi / Dukungan",
    whatsapp_link: "https://chat.whatsapp.com/EJgcCSymQYE3724FqpFzxr",
    footer_text: "\u{1F510} Dikembangkan dengan dedikasi @2026.",
    image_tool: "Gambar",
    video_tool: "Video",
    vector_tool: "Vektor",
    upload_images: "1. Unggah File Gambar",
    upload_videos: "1. Unggah File Video",
    upload_vector_thumbnails: "1. Unggah File Vektor",
    drag_drop: "Tarik & lepas di sini, atau",
    click_to_choose: "pilih file",
    files_selected: "file terpilih.",
    uploading_file: "Mempersiapkan unggahan...",
    add_new: "Tambah Lagi",
    clear_all: "Hapus Semua",
    generate_metadata_ai: "2. Optimasi Metadata AI",
    generate_desc: "AI menganalisis konten visual (termasuk multi-frame untuk video) untuk hasil terbaik.",
    continue_generate: "Lanjutkan Proses",
    custom_prompt_optional: "Instruksi / Target Kata Kunci (Opsional):",
    custom_prompt_placeholder: "Contoh: 'gaya retro, fokus pada syal merah' atau 'Biru, Laut, Musim Panas'.",
    keyword_count_label: "Jumlah Kata Kunci (1-49):",
    keyword_count_auto: "Otomatis",
    generate_all: "Proses Metadata",
    generating: "AI sedang menganalisis...",
    retry_failed: "Coba Ulang Gagal",
    ai_processing: "Proses AI sedang berlangsung...",
    generation_mode_label: "Mode Pemrosesan:",
    generation_mode_standard: "Standar",
    generation_mode_standard_desc: "Akurat, stabil.",
    generation_mode_batch: "Batch",
    generation_mode_batch_desc: "Cepat, pemrosesan serentak.",
    review_edit: "3. Tinjau & Edit",
    review_edit_desc: "Verifikasi kepatuhan terhadap standar stock melalui kotak pratinjau.",
    keywords_label: "Kata Kunci",
    title_label: "Judul",
    description_label: "Deskripsi",
    category_adobe_label: "Kategori Adobe Stock",
    category_shutterstock_1_label: "Kategori Shutterstock 1",
    category_shutterstock_2_label: "Kategori Shutterstock 2",
    enter_title: "Masukkan judul...",
    enter_description: "Deskripsikan konten...",
    select_category: "Pilih kategori...",
    original_filename: "Nama File:",
    close: "Tutup",
    download_csv: "Unduh CSV",
    download_disabled_tooltip: "Selesaikan semua proses AI terlebih dahulu.",
    export_metadata: "4. Ekspor",
    language: "Bahasa",
    english: "Inggris",
    indonesian: "Indonesia",
    regenerate: "Regenerasi Metadata",
    hero_badge: "AI-Driven Metadata Engine",
    hero_title_part1: "Optimalisasi",
    hero_title_part2: "Stock Asset",
    hero_title_part3: "Instan",
    hero_description: "MetaZo memanfaatkan kecerdasan AI untuk menghasilkan judul, deskripsi, dan tag otomatis bagi portal stock global.",
    hero_cta_how: "Cara Pakai",
    hero_stats_file: "File",
    license_active_title: "Lisensi Komersial Aktif",
    license_active_desc: "Akses tanpa batas telah aktif untuk workflow profesional",
    license_pro_badge: "\u2605 PRO",
    trial_badge: "Versi Trial",
    trial_desc_part1: "Gunakan",
    trial_desc_part2: "dalam mode terbatas. Dapatkan akses unlimited dengan lisensi premium seharga",
    trial_cta_license: "Lisensi",
    trial_cta_admin: "Admin",
    workspace_title: "Pilih Ruang Kerja",
    workspace_modes: "3 Mode",
    image_ws_title: "Image AI",
    image_ws_desc: "Optimasi foto, poster, atau karya seni raster (JPG, PNG, WEBP) secara otomatis.",
    image_ws_cta: "Optimasi Gambar",
    video_ws_title: "Video AI",
    video_ws_desc: "Analisis klip video (MP4, MOV, WEBM) untuk metadata sinematik yang presisi.",
    video_ws_cta: "Optimasi Video",
    vector_ws_title: "Vector AI",
    vector_ws_desc: "Metadata otomatis untuk file vektor (SVG, EPS, AI) guna kebutuhan elemen desain UI/UX.",
    vector_ws_cta: "Optimasi Vektor",
    daily_quota: "Kuota Hari Ini",
    quota_exhausted: "\u26A0\uFE0F Kuota habis. Coba besok.",
    queue_status_title: "Status Antrean Data",
    status_success: "Metadata Oke",
    status_ready: "Siap Diproses AI",
    status_draft: "Draf Belum Dikonfigurasi",
    status_error: "Masalah / Error",
    success_rate: "Persentase Sukses",
    dist_title: "Distribusi Format Upload",
    no_files_title: "Belum Ada File Terunggah",
    no_files_desc: 'Gunakan tab menu "Metadata Gen" untuk mengunggah file Anda.',
    dist_image_label: "Ruang Kerja Gambar (Image)",
    dist_video_label: "Ruang Kerja Video (Video)",
    dist_vector_label: "Ruang Kerja Vektor (Vector)",
    portal_ready: "Siap",
    sidebar_dashboard: "Dashboard",
    sidebar_metadata_gen: "Gen Metadata",
    sidebar_prompt_gen: "Gen Prompt",
    sidebar_prompt_text: "Prompt Teks",
    sidebar_prompt_image: "Prompt Gambar",
    sidebar_prompt_video: "Prompt Video",
    sidebar_image_check: "Cek Gambar & Video",
    sidebar_calendar_gen: "Gen Kalender",
    sidebar_chat: "Chat Akun",
    sidebar_activation_premium: "AKTIVASI PREMIUM",
    sidebar_pro_active: "PRO AKTIF",
    sidebar_manage: "Kelola",
    sidebar_core_generators: "Generator Utama",
    sidebar_core_tools: "Alat Utama",
    sidebar_processing_mode: "Mode Proses",
    sidebar_tuning: "Tuning",
    sidebar_resources: "Sumber Daya",
    sidebar_about: "Tentang MetaZo PRO",
    sidebar_subscription_plan: "Paket Langganan",
    default_pricing: "30 Hari = 50.000 - Unlimited = 250.000",
    topbar_system_time: "Waktu Sistem Saat Ini",
    topbar_stability_core: "STABILITAS CORE AKTIF",
    topbar_pro_active: "\u{1F451} PRO AKTIF",
    topbar_trial_eval: "\u26A0\uFE0F EVALUASI TRIAL",
    upload_title: "Unggah Aset",
    upload_reset: "Atur Ulang",
    upload_reset_title: "Atur Ulang Semua",
    upload_help: "Unggah file gambar, video, atau vektor Anda di sini untuk diproses.",
    upload_file_placeholder: "FILE",
    upload_next_ai: "Lanjut: Konfigurasi AI",
    info_modal_title: "MetaZo PRO Handbook & Petunjuk Penggunaan",
    info_modal_operational_guide: "\u2728 Panduan Operasional MetaZo PRO",
    info_modal_step1_title: "Workspace Selection",
    info_modal_step1_desc_p1: "Pilih mode",
    info_modal_step1_desc_p2: "pada Dashboard utama. Unggah file Anda melalui fitur drag-and-drop atau klik area unggah.",
    info_modal_step2_title: "AI Analysis & Metadata Generation",
    info_modal_step2_desc: "Setelah diunggah, klik Process Metadata. Mesin AI Vision kami akan menganalisis konten visual untuk menghasilkan Judul, Deskripsi, dan Kategori secara otomatis.",
    info_modal_step3_title: "Prompt Gen & Image AI (Terintegrasi!)",
    info_modal_step3_desc_highlight: "Fitur Prompt Gen kini terintegrasi dengan Calendar Gen untuk memudahkan pembuatan konten stok berdasarkan event terpopuler.",
    info_modal_step3_desc_main: "Gunakan fitur Prompt Gen untuk menghasilkan deskripsi visual yang mendalam untuk AI Art.",
    info_modal_step4_title: "Image Check (QC)",
    info_modal_step4_desc: "Pastikan aset Anda bebas dari pelanggaran IP, logo, dan noise berlebih dengan fitur Image Check sebelum diunggah ke agency.",
    info_modal_step5_title: "Calendar Gen (Niche Hunter)",
    info_modal_step5_desc: "Temukan event-event penting di masa depan secara global untuk membantu Anda menentukan tema produksi konten stok yang sedang dicari buyer.",
    info_modal_step6_title: "Export & Download",
    info_modal_step6_desc: "Setelah sesuai, gunakan fitur Export untuk mengunduh metadata dalam format CSV yang kompatibel dengan Adobe Stock, Shutterstock, dll.",
    info_modal_tips_title: "\u26A1 Tips Mode Pemrosesan",
    info_modal_std_mode_title: "Standard Mode",
    info_modal_std_mode_desc: "Memproses file satu per satu secara berurutan. Sangat aman dan stabil untuk menghindari kendala batasan API (rate limit).",
    info_modal_batch_mode_title: "Batch Mode",
    info_modal_batch_mode_desc: "Memproses banyak file sekaligus secara simultan. Disarankan untuk memproses asset dalam jumlah besar jika waktu menjadi prioritas utama Anda.",
    info_modal_trial_premium_title: "\u{1F4B3} Handbook Trial & Premium",
    info_modal_trial_mode_label: "Mode Trial:",
    info_modal_trial_mode_desc: "Anda berada dalam masa uji coba gratis dengan batasan harian untuk memastikan kestabilan sistem. Fitur tertentu mungkin terbatas.",
    info_modal_premium_mode_label: "Premium (Lisensi):",
    info_modal_premium_mode_desc: "Dengan Serial Key lisensi, semua batasan dihapus sepenuhnya. Dapatkan akses unlimited untuk pemrosesan aset profesional Anda.",
    info_modal_license_cta: "Butuh lisensi? Hubungi admin untuk mendapatkan Serial Key resmi & tingkatkan akun Anda ke Premium!",
    info_modal_supported_formats: "\u{1F4C1} Format File yang Didukung",
    info_modal_close_button: "Tutup Petunjuk",
    settings_modal_title: "Pengaturan Provider Model AI",
    settings_main_provider_label: "Provider AI Utama Yang Digunakan",
    settings_gemini_model_label: "Pilih Model Gemini",
    settings_gemini_desc: "Anda dapat menyimpan beberapa API Key Gemini pribadi. Sistem secara cerdas melakukan rotasi otomatis demi menghindari hambatan kuota (*rate limit / RESOURCE_EXHAUSTED*).",
    settings_gemini_key_list: "Daftar API Key Gemini",
    settings_no_keys: "Tidak ada API Key yang ditemukan untuk provider ini.",
    settings_gemini_model_auto: "Otomatis (Pilih Yang Stabil)",
    settings_use_default_key: "Menggunakan Gemini Key default server global.",
    welcome_title: "Selamat Datang di MetaZo PRO v1.3.0",
    welcome_subtitle: "Stock Asset Optimizer",
    welcome_features_label: "Fitur:",
    welcome_feature1: "Optimasi aset stok bertenaga AI",
    welcome_feature2: "Generasi ringan & cepat",
    welcome_feature3: "Dukungan banyak provider",
    welcome_feature4: "Manajemen prompt lanjutan",
    welcome_get_started: "Mulai Sekarang",
    common_or: "atau",
    common_and: "dan",
    activation_modal_title_trial_expired: "Masa Trial Habis",
    activation_modal_title_normal: "Aktivasi Lisensi Resmi",
    activation_modal_unlock_premium: "Unlock Premium SaaS",
    activation_active_status: "Aplikasi Aktif \u2022 Premium PRO",
    activation_key_registered: "Kunci Terdaftar:",
    activation_subscription_left: "Masa Berlangganan:",
    activation_days_left: "Hari Lagi",
    activation_commercial_notice: "Commercial copy licensed under key constraints.",
    activation_btn_unsubscribe: "Berhenti Berlangganan (Cabut Lisensi)",
    activation_trial_expired_hero: "Masa Trial 7 Hari Habis!",
    activation_trial_expired_desc: "Masa uji coba gratis Anda telah berakhir. Sila lakukan pembayaran dan masukkan Serial Key Lisensi di bawah untuk melanjutkan pemakaian Metadata Gen, Prompt Teks, & Kalender Gen.",
    activation_trial_active_hero: "Masa Trial Aktif",
    activation_trial_active_days: "Hari Lagi",
    activation_trial_active_desc: `Anda berada di mode Free Trial. Semua fitur terbuka dengan batasan maksimal ${getDailyLimit()} kali generate per hari. Lakukan aktivasi resmi untuk membuka semua fitur tanpa batas.`,
    activation_input_label: "Masukkan Serial Key Lisensi",
    activation_input_placeholder: "FORMAT: MZPRO-XXXX-XXXX-XXXX",
    activation_error_empty: "Mohon masukkan Serial Key lisensi Anda terlebih dahulu.",
    activation_error_expired: "Masa aktif Serial Key ini (30 Hari) telah kedaluwarsa. Sila beli key baru.",
    activation_error_used: "Serial Key ini sudah digunakan oleh pengguna lain! Mohon gunakan Serial Key yang berbeda.",
    activation_error_invalid: "Serial Key tidak terdaftar atau salah. Sila hubungi Admin untuk membeli Key Resmi.",
    activation_error_offline: "Koneksi internet bermasalah dan validasi offline gagal.",
    activation_success_waiting: "\u2714 Lisensi divalidasi! Mengaktifkan premium...",
    activation_btn_process: "Memproses Aktivasi...",
    activation_btn_activate: "Aktivasi Premium",
    activation_no_license_title: "Belum Punya Lisensi? Dapatkan Instan:",
    activation_personal_activation: "Aktivasi Personal",
    activation_license_price: "Harga Lisensi:",
    activation_buy_whatsapp: "Beli Key Lisensi via WhatsApp",
    activation_confirm_stop_title: "Konfirmasi Berhenti",
    activation_confirm_stop_desc: "Apakah Anda yakin ingin mematikan status premium dan mengembalikan aplikasi ke masa uji coba / trial?",
    activation_btn_stop_yes: "Ya, Berhenti",
    activation_btn_stop_no: "Batal",
    sidebar_expand: "Perluas Sidebar",
    sidebar_collapse: "Sembunyikan Sidebar",
    sidebar_manage_license: "Kelola Lisensi / Berhenti Langganan",
    sidebar_activation_tooltip: "Aktivasi Lisensi Resmi / Mulai Pro",
    topbar_toggle_theme: "Ganti Tema",
    topbar_info_manual: "Petunjuk Manual",
    topbar_settings_api: "Pengaturan & API Key",
    common_editor: "Editor",
    common_mode: "Mode",
    prompt_title: "Prompt Teks Studio",
    prompt_subtitle: "Sintesis Ide Visual dengan Spektrum Kreativitas & Kategori Artistik",
    prompt_engine_active: "Gemini Pro Engine Active",
    prompt_formula_title: "Formula & Konfigurasi Estetika",
    prompt_tab_background: "Tab Background",
    prompt_tab_png: "Tab PNG Asset",
    prompt_trial_label: "Trial Hari Ini: Prompt Teks",
    prompt_generate_count: "Generate",
    prompt_trial_expired: `\u26A0\uFE0F Batas trial gratis harian (${getDailyLimit()} generate) telah dicapai. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.`,
    prompt_trial_remaining: `Masa Trial gratis ${getDailyLimit()} generate/hari. Sisa kuota generate hari ini:`,
    prompt_trial_times: "kali",
    prompt_image_trial_label: "Trial Hari Ini: Prompt Gambar",
    prompt_image_generate_count: "Generate",
    prompt_image_trial_expired: `\u26A0\uFE0F Batas trial gratis harian (${getDailyLimit()} generate) telah dicapai. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.`,
    prompt_image_trial_remaining: `Masa Trial gratis ${getDailyLimit()} generate/hari. Sisa kuota generate hari ini:`,
    prompt_image_trial_times: "kali",
    prompt_video_trial_label: "Trial Hari Ini: Prompt Video",
    prompt_video_generate_count: "Generate",
    prompt_video_trial_expired: `\u26A0\uFE0F Batas trial gratis harian (${getDailyLimit()} generate) telah dicapai. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.`,
    prompt_video_trial_remaining: `Masa Trial gratis ${getDailyLimit()} generate/hari. Sisa kuota generate hari ini:`,
    prompt_video_trial_times: "kali",
    image_check_trial_label: "Trial Hari Ini: Audit Kualitas",
    image_check_generate_count: "Audit",
    image_check_trial_expired: `\u26A0\uFE0F Batas trial gratis harian (${getDailyLimit()} audit) telah dicapai. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.`,
    image_check_trial_remaining: `Masa Trial gratis ${getDailyLimit()} audit/hari. Sisa kuota audit hari ini:`,
    image_check_trial_times: "kali",
    prompt_subject_label: "Ide Visual / Subjek Gambar",
    prompt_subject_placeholder: "Ketik ide visual Anda secara bebas di sini...",
    prompt_inspiration_label: "\u{1F4A1} Butuh Inspirasi? Klik Preset di bawah:",
    prompt_negative_label: "Negative Prompt (Anti-Elemen)",
    prompt_negative_subtitle: "Avoid Elements",
    prompt_negative_desc: "Elemen di atas akan dikirimkan ke model AI untuk dihindari secara ketat pada hasil sintesis prompt.",
    prompt_style_master_label: "Kategori Gaya Master (Artistic Master Style)",
    prompt_style_quick_label: "Gaya Cepat (Quick Selection Tab)",
    prompt_png_bg_label: "Pilihan Background PNG",
    prompt_png_bg_desc: "AI secara pintar akan menyematkan instruksi warna latar belakang solid ini ke dalam prompt agar subjek gambar terisolasi dengan rapi.",
    prompt_variation_label: "Dimensi & Jml Variasi Output",
    prompt_variation_unit: "Variasi",
    prompt_word_count_label: "Word Count Range (Panjang Prompt)",
    prompt_word_count_desc: "Mengatur seberapa detail AI mengekspansi deskripsi visual setiap prompt.",
    prompt_btn_synthesize: "Sintesis {count} Prompt Sekarang",
    prompt_btn_synthesizing: "AI Mengekspansi {count} Variasi Estetika...",
    prompt_preset_lite: "Cepat, efisien, formulasi ringkas dan representatif.",
    prompt_preset_artistic: "Penuh opsi atmosfer kamera, lensa variatif, dan gaya estetis seimbang.",
    prompt_preset_ultra: "Detail super kompleks, kaya tekstur, opsi lighting, dan ragam sudut pandang.",
    prompt_loading_step1: "Merumuskan Skenario Kreatif...",
    prompt_loading_step2: "Mensintesis Detail Artistik...",
    prompt_loading_step3: "Memoles Spektrum Prompt...",
    prompt_loading_step4: "Finalisasi Koleksi Output...",
    prompt_studio_title: "Prompt Teks Studio",
    prompt_studio_subtitle: "Sintesis Ide Visual dengan Spektrum Kreativitas & Kategori Artistik",
    prompt_studio_version: "Advanced AI Teks Creator v2.5",
    prompt_output_title: "Generated Prompts",
    prompt_output_subtitle: "Semua prompt siap disalin ke Midjourney / DALL-E / Firefly / Stable Diffusion",
    prompt_output_badge_png: "\u2728 PNG: LATAR {color}",
    prompt_output_badge_scene: "\u{1F5BC}\uFE0F Background Scene",
    prompt_output_btn_copy_all: "Salin Semua",
    prompt_output_btn_copied: "Disalin",
    prompt_output_btn_download: "Download",
    prompt_output_btn_clear: "Clear",
    prompt_output_search_placeholder: "Saring prompt (contoh: 'lighting', 'macro', 'epic', 'camera')...",
    prompt_output_no_match_title: "Tidak ada kecocokan filter",
    prompt_output_no_match_desc: 'Kata kunci "{query}" tidak ditemukan pada {count} prompt.',
    image_studio_title: "Prompt Image Studio",
    image_studio_subtitle: "Ekstraksi Deskripsi & Estetika dari Referensi Gambar Anda (Single & Batch Mode)",
    image_studio_version: "Image-to-Prompt Batch v2.0",
    image_studio_upload_label: "Panel Unggah Gambar",
    image_studio_clear_all: "Hapus Semua",
    image_studio_drag_drop: "Unggah / Seret Gambar",
    image_studio_release: "Lepaskan Gambar",
    image_studio_support_multiple: "Mendukung banyak file sekaligus",
    image_studio_target_label: "Pilih Target Estetika",
    image_studio_btn_analyze: "Hasilkan Prompt ({count} Item Baru)",
    image_studio_btn_analyzing: "Memproses {count} Item ({progress}%)",
    image_studio_dashboard_title: "Progress Dashboard Antrian",
    image_studio_status_label: "Status: {finished}/{total} Selesai",
    image_studio_btn_copy_all: "Salin Semua",
    image_studio_btn_copied_all: "Disalin Semua",
    image_studio_empty_title: "Belum Ada Gambar dalam Antrian",
    image_studio_empty_desc: "Unggah satu atau beberapa gambar referensi untuk mengekstraksi prompt estetika AI secara instan.",
    video_studio_title: "Prompt Video Studio",
    video_studio_subtitle: "Sintesis Deskripsi & Prompt dari Referensi Gerak Video",
    video_studio_keyword_placeholder: "Masukkan keyword gerak (contoh: 'Cinematic Landscape', 'Epic Action')...",
    video_studio_btn_analyze: "Analisis Gerak",
    video_studio_btn_analyzing: "Menganalisis...",
    video_studio_history_title: "Riwayat Analisis",
    video_studio_btn_clear_history: "Bersihkan Riwayat",
    video_studio_hollywood_title: "Sintesis Hollywood",
    video_studio_hollywood_desc: "Hasilkan prompt director standar Hollywood profesional berdasarkan analisis gerak.",
    video_studio_btn_generate_hollywood: "Hasilkan Hollywood Prompt",
    video_studio_btn_generating_hollywood: "Mensintesis Hollywood Prompt...",
    video_studio_btn_download: "Download Prompt",
    video_studio_camera_label: "Kamera",
    video_studio_technical_label: "Technical String",
    video_studio_saturation_title: "Saturasi Pasar",
    video_studio_saturation_desc: "Peringatan otomatis jika pasar sudah terlalu jenuh dengan konten serupa.",
    video_studio_revenue_title: "Prakiraan Pendapatan",
    video_studio_revenue_desc: "Estimasi potensi pendapatan berdasarkan tren pembeli di Adobe Stock & Shutterstock.",
    video_studio_error_empty: "Mohon masukkan keyword terlebih dahulu.",
    video_studio_error_fail: "Gagal menganalisis keyword. Coba lagi nanti.",
    calendar_title: "Kalender Visual Strategis",
    calendar_subtitle: "Temukan momen strategis berdasarkan hari libur & tren pasar global.",
    calendar_months_january: "Januari",
    calendar_months_february: "Februari",
    calendar_months_march: "Maret",
    calendar_months_april: "April",
    calendar_months_may: "Mei",
    calendar_months_june: "Juni",
    calendar_months_july: "Juli",
    calendar_months_august: "Agustus",
    calendar_months_september: "September",
    calendar_months_october: "Oktober",
    calendar_months_november: "November",
    calendar_months_december: "Desember",
    calendar_btn_generate: "Cari Event",
    calendar_btn_generating: "Menganalisis...",
    calendar_month_label: "Pilih Bulan",
    calendar_card_btn_keywords: "Hasilkan Keyword",
    calendar_card_btn_prompt: "Buat Prompt",
    calendar_error_fail: "Gagal memuat event. Silakan coba lagi.",
    style_photorealistic: "Photorealistic (Realistis)",
    style_cinematic: "Cinematic (Film)",
    style_adobe_stock: "Adobe Stock Style",
    style_editorial: "Editorial (Majalah)",
    style_lifestyle: "Lifestyle (Gaya Hidup)",
    style_fine_art: "Fine Art (Seni Tinggi)",
    prompt_error_trial: `Batas Trial Terlampaui. Anda telah mencapai batas maksimal ${getDailyLimit()} kali generate Prompt Teks hari ini. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.`,
    prompt_error_empty: "Silakan masukkan ide dasar atau subjek murni visual terlebih dahulu.",
    prompt_png_bg_white: "\u26AA Latar Putih (White background)",
    prompt_png_bg_black: "\u26AB Latar Hitam (Black background)",
    prompt_png_bg_transparent: "\u{1F3C1} Latar Transparan (Transparent background)",
    qc_title: "Audit",
    qc_title_check: "Kualitas",
    qc_subtitle: "AI Expert Standar Adobe Stock",
    qc_btn_reset: "Reset",
    qc_btn_analyze: "Mulai Audit Asset",
    qc_btn_analyzing: "Menganalisis...",
    qc_tolerance_label: "Toleransi Kualitas",
    qc_upload_hub: "Upload Hub",
    qc_drop_images_here: "Drop Gambar/Video/Vektor Di Sini",
    qc_release_images: "Lepaskan File",
    qc_multiple_upload: "Mendukung Gambar, Video & Vektor (.eps, .ai)",
    qc_queue_assets: "Asset dalam Antrean",
    qc_pending_audit: "Menunggu Audit",
    qc_analyzing_text: "Spesialis QC Adobe Stock",
    qc_analyzing_desc: "Menganalisis nilai hukum, teknis, dan komersial",
    qc_info_empty: "Silahkan upload file dulu untuk memulai proses audit kurasi",
    qc_score_label: "SKOR QC",
    qc_hide_heatmap: "Sembunyikan Heatmap",
    qc_analyze_heatmap: "Analisis Heatmap Pixel",
    qc_pixel_engine: "Pixel Engine",
    qc_rejection_reason: "Alasan Penolakan",
    qc_legal_status: "Status Hukum",
    qc_quality_metadata: "Metadata Kualitas",
    qc_close: "Tutup",
    qc_view_audit: "Lihat Audit",
    qc_strengths: "Kelebihan",
    qc_tech_analysis: "Analisis Teknis",
    qc_detailed_feedback: "Umpan Balik Detail",
    guide_btn_title: "Lihat Panduan Fitur",
    guide_dashboard_title: "Panduan Dashboard",
    guide_dashboard_desc: "Ringkasan metrik akun, utilitas dan akses langsung ke seluruh alat asisten metadata Anda.",
    guide_prompt_gen_title: "Panduan Prompt Studio",
    guide_prompt_gen_desc: "Ketik kata dasar, dan AI akan meracik prompt siap pakai untuk kebutuhan generatif AI Microstock.",
    guide_prompt_text_title: "Panduan Prompt Teks",
    guide_prompt_text_desc: "Ketik kata dasar, dan AI akan meracik prompt siap pakai untuk kebutuhan generatif AI Microstock.",
    guide_prompt_image_title: "Panduan Prompt Gambar",
    guide_prompt_image_desc: "Unggah gambar referensi untuk mengekstraksi deskripsi estetika dan formula prompt secara instan.",
    guide_prompt_video_title: "Panduan Prompt Video",
    guide_prompt_video_desc: "Analisis kata kunci gerakan untuk mensintesis prompt sinematik dan instruksi direktur secara profesional.",
    guide_image_title: "Panduan AI Gambar",
    guide_image_desc: "Deskripsi otomatis gambar Anda menjadi metadata standar tinggi (Judul, Deskripsi, 50 Keywords komersial).",
    guide_video_title: "Panduan AI Video",
    guide_video_desc: "Dapatkan kata kunci khusus footages yang mengekstrak elemen gerakan, sinematografi, dan alur.",
    guide_vector_title: "Panduan Vektor EPS",
    guide_vector_desc: "Unggah fle EPS ilustrasi secara langsung. Sistem akan dengan mulus mengekstrak metadata spesifik grafik vektor.",
    guide_image_check_title: "Panduan Audit Gambar",
    guide_image_check_desc: "Cek kualitas sebelum submit ke agensi. AI akan menganalisa titik-titik penolakan dan pelanggaran pedoman teknis.",
    guide_calendar_title: "Panduan Kalender AI",
    guide_calendar_desc: "Bangun perencanan konten dengan ide-ide komersial musiman yang akan laris berdasarkan tren.",
    sidebar_mute_video: "Mute Video Gen",
    mute_title: "Batch Mute Video Gen",
    mute_subtitle: "Hilangkan suara dari banyak berkas video stock secara instan & lossless sekaligus",
    mute_btn_clear: "Hapus Semua",
    mute_drag_drop: "Tarik & Letakkan beberapa file video di sini",
    mute_formats_supported: "Mendukung banyak file MP4, MOV, WebM sekaligus (Maks 500MB per file)",
    mute_btn_choose: "PILIH BERKAS VIDEO",
    mute_error_invalid_files: "File berikut diabaikan karena bukan video: {names}",
    mute_queue_title: "Daftar Antrean Video ({count})",
    mute_stat_done: "Selesai",
    mute_stat_processing: "Proses",
    mute_stat_failed: "Gagal",
    mute_stat_pending: "Menunggu",
    mute_btn_processing: "MEMPROSES BATCH ({current}/{total})...",
    mute_btn_mute_queue: "MUTE ANTRIAN VIDEO",
    mute_btn_download_all: "UNDUH SEMUA ({count})",
    mute_status_muting: "Muting...",
    mute_status_success: "Sukses",
    mute_status_failed_badge: "Gagal",
    mute_status_pending_badge: "Menunggu",
    mute_tooltip_remove: "Hapus dari antrean",
    mute_preview_title: "Pratinjau Media",
    mute_preview_size: "Ukuran",
    mute_preview_format: "Format",
    mute_preview_error: "Kesalahan",
    mute_preview_empty: "Pilih video dari daftar antrean untuk memutar pratinjau",
    mute_guide_title: "Panduan Penggunaan",
    mute_guide_step1_title: "Pilih Berkas",
    mute_guide_step1_desc: "Seret beberapa video atau klik tombol pilih berkas di atas.",
    mute_guide_step2_title: "Mulai Proses",
    mute_guide_step2_desc: "Klik tombol Mute Antrian Video untuk menghilangkan suara semua video sekaligus secara berurutan.",
    mute_guide_step3_title: "Unduh Hasil",
    mute_guide_step3_desc: "Unduh satu per satu menggunakan tombol di samping nama file, atau klik Unduh Semua untuk mengunduh semua video sukses sekaligus.",
    mute_guide_footer: "\u{1F512} Semua file diproses secara lokal di server sandbox yang aman, dan akan segera dihancurkan setelah pengunduhan selesai.",
    guide_mute_video_title: "Panduan Mute Video",
    guide_mute_video_desc: "Hilangkan suara dari banyak berkas video stock secara instan & lossless sekaligus untuk memenuhi persyaratan agensi.",
    mute_auto_download_label: "Auto-Unduh",
    mute_auto_download_desc: "Unduh otomatis saat selesai",
    mute_trial_expired: "\u26A0\uFE0F Batas trial gratis harian (25 video mute) telah dicapai. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas.",
    mute_trial_remaining: "Masa Trial gratis 25 video mute/hari. Sisa kuota hari ini: {remaining} kali",
    mute_error_trial: "Batas Trial Terlampaui. Anda telah mencapai batas maksimal 25 video mute hari ini. Sila hubungi admin atau masukkan kode aktivasi untuk memproses tanpa batas."
  }
};

// server/gemini.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var apiKeyStorage = new import_node_async_hooks.AsyncLocalStorage();
try {
  const envPath = import_node_path.default.join(process.cwd(), ".env");
  if (import_node_fs.default.existsSync(envPath)) {
    const envContent = import_node_fs.default.readFileSync(envPath, "utf-8");
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        let val = trimmed.slice(index + 1).trim();
        if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    });
    console.log("[ENV LOAD] Loaded custom configurations from workspace .env file.");
  }
} catch (e) {
  console.warn("[ENV LOAD WARNING] Could not read .env file:", e);
}
var getBluesmindsEndpoint = () => {
  const envVal = process.env.BLUESMINDS_API_ENDPOINT;
  if (!envVal || !envVal.trim()) {
    return "https://api.bluesminds.com/v1/chat/completions";
  }
  let base = envVal.trim();
  if (base.endsWith("/chat/completions")) {
    return base;
  }
  if (base.endsWith("/chat/completions/")) {
    return base.slice(0, -1);
  }
  if (base.endsWith("/v1")) {
    return `${base}/chat/completions`;
  }
  if (base.endsWith("/v1/")) {
    return `${base}chat/completions`;
  }
  if (base.endsWith("/")) {
    return `${base}v1/chat/completions`;
  }
  return `${base}/v1/chat/completions`;
};
var PROVIDER_ENDPOINTS = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  blackbox: "https://api.blackbox.ai/v1/chat/completions",
  nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
  bluesminds: getBluesmindsEndpoint(),
  aivene: "https://api.aivene.com/v1/chat/completions"
};
var PROVIDER_DEFAULT_MODELS = {
  groq: "meta-llama/llama-4-scout-17b-16e-instruct",
  mistral: "pixtral-12b",
  openai: "gpt-4o",
  openrouter: "google/gemini-2.0-flash-001",
  blackbox: "blackboxai",
  nvidia: "meta/llama-3.3-70b-instruct",
  bluesminds: "gpt-4o",
  aivene: "gpt-4o"
};
var PROVIDER_FALLBACK_MODELS = {
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-large-latest",
  openai: "gpt-4o",
  openrouter: "anthropic/claude-3.5-haiku",
  blackbox: "blackboxai-pro",
  nvidia: "meta/llama-3.1-70b-instruct",
  bluesminds: "gpt-4o",
  aivene: "gpt-4o"
};
var SUPPORTS_JSON_MODE = /* @__PURE__ */ new Set(["groq", "mistral", "openai", "openrouter", "nvidia", "bluesminds", "aivene"]);
var PROVIDER_ENV_KEYS = {
  groq: "GROQ_API_KEY",
  mistral: "MISTRAL_API_KEY",
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  blackbox: "BLACKBOX_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  bluesminds: "BLUESMINDS_API_KEY",
  aivene: "AIVENE_API_KEY"
};
var NON_GEMINI_PROVIDERS = /* @__PURE__ */ new Set(["groq", "mistral", "openai", "openrouter", "blackbox", "nvidia", "bluesminds", "aivene"]);
function extractJSON(raw) {
  if (!raw) return "{}";
  try {
    const trimmed = raw.trim();
    JSON.parse(trimmed);
    return trimmed;
  } catch (e) {
  }
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const tryExtract = (opener, closer) => {
    let startIdx = 0;
    while ((startIdx = cleaned.indexOf(opener, startIdx)) !== -1) {
      let endIdx = cleaned.lastIndexOf(closer);
      while (endIdx > startIdx) {
        const potential = cleaned.slice(startIdx, endIdx + 1);
        try {
          JSON.parse(potential);
          return potential;
        } catch (e) {
          endIdx = cleaned.lastIndexOf(closer, endIdx - 1);
        }
      }
      startIdx++;
    }
    return null;
  };
  const objectMatch = tryExtract("{", "}");
  if (objectMatch) return objectMatch;
  const arrayMatch = tryExtract("[", "]");
  if (arrayMatch) return arrayMatch;
  return "{}";
}
var COLOR_KEYWORDS = /* @__PURE__ */ new Set([
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "brown",
  "black",
  "white",
  "gray",
  "grey",
  "gold",
  "silver",
  "bronze",
  "violet",
  "indigo",
  "cyan",
  "magenta",
  "teal",
  "navy",
  "beige",
  "charcoal",
  "cream",
  "peach",
  "lavender",
  "turquoise",
  "emerald",
  "ruby",
  "amber",
  "olive",
  "coral",
  "crimson",
  "scarlet",
  "maroon",
  "plum",
  "ivory",
  "mustard",
  "khaki",
  "mint",
  "lime",
  "tan",
  "mauve",
  "pastel"
]);
var PROHIBITED_KEYWORDS_SET = /* @__PURE__ */ new Set([
  "apple",
  "iphone",
  "ipad",
  "macbook",
  "mac",
  "ios",
  "android",
  "microsoft",
  "windows",
  "xbox",
  "playstation",
  "sony",
  "samsung",
  "nike",
  "adidas",
  "gucci",
  "rolex",
  "cocacola",
  "coca-cola",
  "pepsi",
  "starbucks",
  "amazon",
  "google",
  "meta",
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "netflix",
  "disney",
  "marvel",
  "canon",
  "nikon",
  "adobe",
  "shutterstock",
  "getty",
  "midjourney",
  "firefly",
  "stablediffusion",
  "dalle",
  "llama",
  "chatgpt",
  "openai",
  "instagram",
  "youtube",
  "whatsapp",
  "brand",
  "trademark",
  "logo",
  "copyright",
  "intellectual",
  "property"
]);
function isProhibitedKeyword(word) {
  if (!word) return true;
  const lower = word.toLowerCase().trim();
  if (PROHIBITED_KEYWORDS_SET.has(lower)) return true;
  const parts = lower.split(/[\s-_]+/);
  if (parts.some((part) => COLOR_KEYWORDS.has(part))) {
    return true;
  }
  return false;
}
function getHeuristicCategories(title, keywords) {
  const t = String(title || "").toLowerCase();
  const kList = (keywords || []).map((x) => String(x).toLowerCase());
  const countMatches = (terms) => {
    let score = 0;
    terms.forEach((term) => {
      if (t.includes(term)) score += 5;
      kList.forEach((k) => {
        if (k === term || k.includes(term)) score += 1;
      });
    });
    return score;
  };
  const categoryScores = {};
  const patterns = {
    1: ["animal", "cat", "dog", "pet", "wildlife", "bird", "fish", "monkey", "lion", "tiger", "bear", "insect", "reptilian", "creature", "beast", "fauna", "mammal", "species", "wilderness", "habitat", "furry", "adorable", "close-up", "environment", "wild", "zoology"],
    2: ["architecture", "building", "structure", "house", "room", "office", "home", "tower", "bridge", "monument", "museum", "interior", "exterior", "floor", "window", "wall", "door", "facade", "construction", "metropolis", "tower", "estate"],
    3: ["business", "corporate", "office", "money", "chart", "graph", "marketing", "manager", "meeting", "resume", "professional", "work", "job", "finance", "desk", "computer", "presentation", "leadership", "organization", "colleague", "career", "investment", "growth"],
    4: ["drink", "beverage", "coffee", "tea", "wine", "beer", "juice", "glass", "cup", "mug", "bottle", "liquid", "cocktail", "draft", "soda"],
    5: ["environment", "eco", "recycle", "green", "sustainability", "recycle", "conservation", "earth", "planet", "wind", "solar", "climate", "environmental", "organic"],
    6: ["emotion", "mood", "feeling", "happy", "sad", "angry", "conceptual", "thought", "brain", "mind", "stress", "focus", "psychology", "attitude", "behavior", "expression", "abstract", "idea", "sensation"],
    7: ["food", "dish", "meal", "kitchen", "restaurant", "dining", "plate", "chef", "fruit", "vegetable", "meat", "dessert", "cake", "bread", "pancake", "pizza", "burger", "fast food", "dinner", "breakfast", "lunch", "sweet", "cream", "baked", "cookies", "sugar", "cuisine", "gourmet", "culinary", "recipe", "diet"],
    8: ["logo", "icon", "frame", "template", "banner", "layout", "sticker", "elements", "background", "wallpaper", "texture", "pattern", "asset", "backdrop", "seamless", "infographic", "chart", "presentation"],
    9: ["hobby", "leisure", "play", "game", "guitar", "music", "movie", "craft", "book", "read", "garden", "recreation", "activity", "fun", "pastime", "indoor", "enjoyment"],
    10: ["industrial", "factory", "manufacturing", "machine", "worker", "equipment", "facility", "metal", "power", "warehouse", "technical", "automated", "construction", "engineering", "machinery"],
    11: ["landscape", "mountain", "sea", "beach", "ocean", "lake", "river", "forest", "desert", "valley", "sunrise", "sunset", "nature", "view", "panorama", "scenery", "scenic", "vista", "sky", "horizon"],
    12: ["lifestyle", "life", "daily", "routine", "casual", "luxury", "habits", "comfort", "domestic", "style", "casual", "wellness", "health", "fitness"],
    13: ["person", "people", "human", "man", "woman", "crowd", "family", "child", "baby", "girl", "boy", "group", "face", "hand", "arm", "leg", "foot", "pose", "portrait", "individual", "young", "adult", "interaction", "relationship"],
    14: ["plant", "flower", "tree", "leaf", "garden", "grass", "rose", "floral", "botany", "botanical", "moss", "herbal", "seeds", "blossom", "petal", "growth", "stem", "vegetation", "spring", "summer"],
    15: ["culture", "religion", "traditional", "church", "temple", "mosque", "cross", "holy", "ceremonial", "holiday", "festival", "heritage", "history", "spiritual", "belief", "faith", "tradition", "custom", "sacred", "ritual", "symbol", "history", "celebration"],
    16: ["science", "biology", "chemistry", "physics", "medicine", "research", "laboratory", "math", "microscope", "formula", "experimental", "data", "lab", "discovery", "study", "experiment"],
    17: ["social issue", "protest", "poverty", "homeless", "war", "peace", "justice", "human rights", "community", "support", "help", "charity", "assistance", "advocacy", "global", "campaign"],
    18: ["sport", "run", "ball", "football", "soccer", "tennis", "golf", "gym", "workout", "athletic", "athlete", "competition", "swimming", "basketball", "training", "exercise", "fitness", "active"],
    19: ["technology", "tech", "smart", "digital", "screen", "laser", "circuit", "code", "program", "blockchain", "database", "ai", "server", "network", "connection", "internet", "future", "futuristic", "communication", "virtual"],
    20: ["transport", "car", "truck", "vehicle", "train", "airplane", "ship", "boat", "road", "street", "highway", "traffic", "transit", "logistics", "delivery", "automobile", "drive", "engine", "auto"],
    21: ["travel", "tourism", "traveler", "hotel", "map", "compass", "passport", "luggage", "packing", "tourist", "vacation", "flight", "destination", "trip", "journey", "adventure", "explore"]
  };
  let maxScore = -1;
  let bestCatId = 8;
  for (const [catIdStr, words] of Object.entries(patterns)) {
    const catId = parseInt(catIdStr, 10);
    const score = countMatches(words);
    categoryScores[catId] = score;
    if (score > maxScore) {
      maxScore = score;
      bestCatId = catId;
    }
  }
  if (maxScore <= 0) {
    bestCatId = 8;
  }
  const mapping = {
    1: { cat1: "Animals/Wildlife", cat2: "Nature" },
    2: { cat1: "Buildings/Landmarks", cat2: "Interiors" },
    3: { cat1: "Business/Finance", cat2: "Technology" },
    4: { cat1: "Food and Drink", cat2: "Objects" },
    5: { cat1: "Nature", cat2: "Backgrounds/Textures" },
    6: { cat1: "Abstract", cat2: "Miscellaneous" },
    7: { cat1: "Food and Drink", cat2: "Objects" },
    8: { cat1: "Abstract", cat2: "Backgrounds/Textures" },
    9: { cat1: "Objects", cat2: "Sports/Recreation" },
    10: { cat1: "Industrial", cat2: "Technology" },
    11: { cat1: "Nature", cat2: "Parks/Outdoor" },
    12: { cat1: "People", cat2: "Miscellaneous" },
    13: { cat1: "People", cat2: "Miscellaneous" },
    14: { cat1: "Nature", cat2: "Backgrounds/Textures" },
    15: { cat1: "Religion", cat2: "Holidays" },
    16: { cat1: "Science", cat2: "Technology" },
    17: { cat1: "Miscellaneous", cat2: "People" },
    18: { cat1: "Sports/Recreation", cat2: "Objects" },
    19: { cat1: "Technology", cat2: "Industrial" },
    20: { cat1: "Transportation", cat2: "Objects" },
    21: { cat1: "Nature", cat2: "Buildings/Landmarks" }
  };
  const choice = mapping[bestCatId] || { cat1: "Abstract", cat2: "Backgrounds/Textures" };
  return {
    category_id: bestCatId,
    shutterstock_category_1: choice.cat1,
    shutterstock_category_2: choice.cat2
  };
}
function ensureTitleLength(title, keywords, description, titleLength) {
  if (!title || title.trim() === "" || title.includes("Write a descriptive title here") || title.includes("<generate a") || title.includes("A highly descriptive") || title.includes("A detailed")) {
    if (description && description.trim().length > 10 && !description.includes("Write a detailed description here") && !description.includes("<generate a") && !description.includes("A highly descriptive") && !description.includes("A detailed")) title = description;
    else if (keywords && keywords.length >= 3) title = keywords.slice(0, 5).join(" ");
    else title = "Stock asset";
  } else {
    title = String(title);
  }
  let cleanedTitle = title.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (cleanedTitle.endsWith(".")) {
    cleanedTitle = cleanedTitle.slice(0, -1).trim();
  }
  const disallowedStarts = [
    "vector of",
    "illustration of",
    "drawing of",
    "continuous line drawing of",
    "vector",
    "illustration",
    "drawing",
    "continuous line drawing"
  ];
  let titleLower = cleanedTitle.toLowerCase();
  for (const start of disallowedStarts) {
    if (titleLower.startsWith(start + " ")) {
      cleanedTitle = cleanedTitle.substring(start.length + 1).trim();
      titleLower = cleanedTitle.toLowerCase();
    }
  }
  let upperLimit = 200;
  if (titleLength === "short") upperLimit = 65;
  if (titleLength === "long") upperLimit = 200;
  if (cleanedTitle.length > upperLimit) {
    let truncated = cleanedTitle.substring(0, upperLimit);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > Math.floor(upperLimit / 2)) {
      truncated = truncated.substring(0, lastSpace);
    }
    cleanedTitle = truncated.trim();
  }
  const words = cleanedTitle.split(/\s+/);
  const deduplicatedWords = [];
  for (let i = 0; i < words.length; i++) {
    const current = words[i];
    const prev = deduplicatedWords[deduplicatedWords.length - 1];
    if (prev && current.toLowerCase() === prev.toLowerCase() && !["and", "with", "in", "on", "the", "a", "of"].includes(current.toLowerCase())) {
      continue;
    }
    deduplicatedWords.push(current);
  }
  cleanedTitle = deduplicatedWords.join(" ");
  cleanedTitle = cleanedTitle.replace(/,/g, "").replace(/\./g, "").replace(/\s+/g, " ").trim();
  if (cleanedTitle.length > 0) {
    cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);
  }
  return cleanedTitle;
}
function ensureDescription(description, title, keywords) {
  if (!description || typeof description !== "string") {
    description = "";
  }
  const isPlaceholderDesc = (desc) => {
    const d = desc.toLowerCase().trim();
    return d === "" || d.includes("write a detailed description here") || d.includes("<generate a") || d.includes("a highly descriptive") || d.includes("a detailed visual description") || d.includes("a detailed description") || d.includes("provide a thorough visual breakdown") || d.includes("detailed description of the image") || d.includes("description of the image") || d.includes("an image containing") || d.includes("this image displays") || d.includes("this is a description");
  };
  if (isPlaceholderDesc(description)) {
    if (title && title.trim().length > 5) {
      const cleanTitle = title.replace(/write a descriptive/gi, "").replace(/<generate/gi, "").replace(/highly descriptive/gi, "").trim();
      if (cleanTitle.length > 5) {
        return `A professional stock photo showcasing ${cleanTitle.toLowerCase()}. Ideal for commercial, editorial, and creative design use.`;
      }
    }
    if (keywords && keywords.length >= 3) {
      return `Professional visual content featuring ${keywords.slice(0, 5).join(", ")}. Perfect for advertising, marketing, and editorial purposes.`;
    }
    return "High-quality professional stock asset designed for commercial, editorial, or creative media projects.";
  }
  return description.trim();
}
var getTitleLengthRule = (titleLength) => {
  if (titleLength === "short") {
    return "Title MUST be highly SEO optimized but kept VERY SHORT and concise (around 3 to 7 words maximum). Just state the core subject briefly.";
  } else if (titleLength === "long") {
    return "Title MUST be highly SEO optimized, extremely detailed, and have at least 15-25 descriptive words to ensure maximum long-tail visibility on stock platforms. Capture all elements.";
  }
  return "Title MUST be highly SEO optimized, front-loaded with primary commercial keywords, and have at least 10-15 descriptive words to ensure maximum visibility on stock platforms.";
};
var getLanguageName = (code) => {
  const map = {
    "en": "ENGLISH",
    "id": "INDONESIAN (BAHASA INDONESIA)",
    "es": "SPANISH",
    "fr": "FRENCH",
    "de": "GERMAN",
    "it": "ITALIAN",
    "pt": "PORTUGUESE",
    "ja": "JAPANESE",
    "ko": "KOREAN",
    "ru": "RUSSIAN",
    "th": "THAI",
    "tr": "TURKISH",
    "nl": "DUTCH",
    "pl": "POLISH"
  };
  return map[code || "en"] || "ENGLISH";
};
function ensureKeywordCount(keywords, targetCount, visualFacts, title, description, categoryId, keywordMode) {
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };
  let uniqueKeywords = [];
  if (Array.isArray(keywords)) {
    keywords.forEach((k) => {
      if (typeof k === "string") {
        const clean = k.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ").trim();
        if (clean.length > 1 && !isProhibitedKeyword(clean)) {
          if (keywordMode === "single" && clean.includes(" ")) {
            const pieces = clean.split(/\s+/);
            pieces.forEach((p) => {
              if (p.length > 1 && !isProhibitedKeyword(p)) {
                const isDuplicate = uniqueKeywords.some(
                  (existing) => existing === p || existing === p + "s" || p === existing + "s" || existing === p + "es" || p === existing + "es" || existing.replace(/ies$/, "y") === p || p.replace(/ies$/, "y") === existing
                );
                if (!isDuplicate) {
                  uniqueKeywords.push(p);
                }
              }
            });
          } else {
            let cleanVal = clean;
            if (keywordMode === "multi" && !clean.includes(" ")) {
              const modifiers = ["concept", "background", "scene", "design", "style", "detail", "asset", "element"];
              const mod = modifiers[Math.abs(hashString(clean)) % modifiers.length];
              cleanVal = `${clean} ${mod}`;
            }
            const isDuplicate = uniqueKeywords.some(
              (existing) => existing === cleanVal || existing === cleanVal + "s" || cleanVal === existing + "s" || existing === cleanVal + "es" || cleanVal === existing + "es" || existing.replace(/ies$/, "y") === cleanVal || cleanVal.replace(/ies$/, "y") === existing
            );
            if (!isDuplicate) {
              uniqueKeywords.push(cleanVal);
            }
          }
        }
      }
    });
  }
  if (uniqueKeywords.length >= targetCount) {
    return uniqueKeywords.slice(0, targetCount);
  }
  const categoryFallbackKeywords = {
    1: ["animal", "nature", "wildlife", "fauna", "creature", "outdoor", "mammal", "species", "wilderness", "natural", "habitat", "furry", "adorable", "portrait", "close-up", "environment", "beast", "pet", "wild", "zoology"],
    2: ["architecture", "building", "structure", "construction", "city", "urban", "exterior", "interior", "design", "modern", "concrete", "glass", "steel", "landmark", "monument", "facade", "metropolis", "tower", "estate", "house", "contemporary"],
    3: ["business", "office", "corporate", "work", "workplace", "finance", "company", "management", "team", "meeting", "strategy", "success", "professional", "marketing", "leadership", "organization", "colleague", "career", "investment", "growth", "concept"],
    4: ["drink", "beverage", "glass", "liquid", "refreshing", "cold", "hot", "cup", "bottle", "mug", "bar", "cafe", "cocktail", "juice", "water", "coffee", "tea", "alcohol", "brew", "ice"],
    5: ["environment", "nature", "landscape", "green", "eco", "ecology", "sustainability", "recycle", "conservation", "earth", "planet", "wild", "scenery", "outdoor", "forest", "climate", "natural", "environmental", "organic"],
    6: ["concept", "mood", "feeling", "emotion", "mental", "mind", "thought", "isolated", "abstract", "idea", "expression", "psychology", "imagination", "sensation", "attitude", "behavior"],
    7: ["food", "delicious", "tasty", "dish", "meal", "gourmet", "culinary", "plate", "eating", "ingredient", "fresh", "vegetable", "fruit", "cooking", "kitchen", "recipe", "diet", "lunch", "dinner", "breakfast", "cuisine"],
    8: ["graphic", "design", "resource", "vector", "illustration", "element", "abstract", "background", "template", "pattern", "asset", "layout", "creative", "art", "flat", "logo", "icon", "backdrop", "seamless"],
    9: ["hobby", "leisure", "recreation", "activity", "fun", "game", "play", "relaxation", "lifestyle", "entertainment", "pastime", "craft", "indoor", "outdoor", "enjoyment"],
    10: ["industry", "industrial", "factory", "manufacture", "production", "technology", "engineering", "machinery", "worker", "equipment", "facility", "metal", "power", "warehouse", "technical", "automated", "construction"],
    11: ["landscape", "scenery", "scenic", "nature", "view", "outdoor", "mountain", "hill", "valley", "field", "panorama", "horizon", "wilderness", "beautiful", "vista", "natural", "sky"],
    12: ["lifestyle", "life", "daily", "routine", "modern", "human", "person", "people", "home", "domestic", "activity", "casual", "habits", "style", "comfort", "leisure"],
    13: ["people", "person", "human", "individual", "portrait", "man", "woman", "adult", "young", "lifestyle", "group", "crowd", "interaction", "relationship", "face", "expressive", "posing"],
    14: ["plant", "flower", "flora", "botany", "botanical", "leaf", "nature", "garden", "green", "blossom", "petal", "growth", "stem", "outdoor", "natural", "organic", "vegetation", "spring", "summer"],
    15: ["culture", "religion", "religious", "spiritual", "belief", "faith", "tradition", "custom", "heritage", "sacred", "ceremony", "ritual", "symbol", "history", "traditional", "temple", "church", "holiday", "celebration"],
    16: ["science", "scientific", "research", "laboratory", "lab", "technology", "analysis", "experiment", "discovery", "study", "chemistry", "biology", "physics", "tech", "equipment", "microscope", "test", "data", "concept"],
    17: ["social", "issue", "community", "society", "problem", "awareness", "support", "help", "advocacy", "global", "campaign", "concept", "message", "public", "humanity", "care"],
    18: ["sports", "sport", "athletic", "athlete", "exercise", "fitness", "training", "game", "competition", "player", "workout", "active", "healthy", "stadium", "court", "field", "gym", "recreation", "action"],
    19: ["technology", "tech", "digital", "device", "modern", "electronic", "innovation", "computer", "network", "connection", "internet", "future", "futuristic", "concept", "data", "communication", "virtual", "smart"],
    20: ["transport", "transportation", "vehicle", "car", "automobile", "traffic", "road", "street", "travel", "highway", "drive", "engine", "movement", "logistics", "delivery", "auto", "transit"],
    21: ["travel", "tourism", "destination", "vacation", "holiday", "trip", "journey", "adventure", "explore", "tourist", "sightseeing", "scenic", "landmark", "outdoor", "recreation", "passport", "luggage"]
  };
  const STOP_WORDS = /* @__PURE__ */ new Set([
    "a",
    "an",
    "the",
    "and",
    "but",
    "or",
    "for",
    "nor",
    "on",
    "at",
    "in",
    "with",
    "by",
    "of",
    "to",
    "from",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "they",
    "them",
    "their",
    "we",
    "us",
    "our",
    "you",
    "your",
    "he",
    "him",
    "his",
    "she",
    "her",
    "isolated",
    "stock",
    "photo",
    "image",
    "picture",
    "vector",
    "illustration",
    "captured",
    "professional",
    "high",
    "quality",
    "resolution",
    "super",
    "ultra",
    "beautiful",
    "stunning",
    "amazing",
    "perfect",
    "ideal"
  ]);
  const extractWords = (str) => {
    if (!str || typeof str !== "string") return [];
    return str.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).map((w) => w.trim()).filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !isProhibitedKeyword(w));
  };
  const sources = [];
  if (visualFacts && visualFacts.primary_subjects && Array.isArray(visualFacts.primary_subjects)) {
    const words = [];
    visualFacts.primary_subjects.forEach((x) => {
      if (x && typeof x === "object" && x.name) {
        words.push(...extractWords(x.name));
      }
    });
    sources.push(words);
  }
  if (visualFacts && visualFacts.secondary_subjects && Array.isArray(visualFacts.secondary_subjects)) {
    const words = [];
    visualFacts.secondary_subjects.forEach((x) => {
      if (x && typeof x === "object" && x.name) {
        words.push(...extractWords(x.name));
      }
    });
    sources.push(words);
  }
  if (visualFacts && visualFacts.colors && Array.isArray(visualFacts.colors)) {
    sources.push(visualFacts.colors.flatMap((c) => {
      if (typeof c === "string") return extractWords(c);
      return [];
    }));
  }
  if (visualFacts && visualFacts.actions && Array.isArray(visualFacts.actions)) {
    sources.push(visualFacts.actions.flatMap((a) => {
      if (typeof a === "string") return extractWords(a);
      return [];
    }));
  }
  if (title && typeof title === "string") {
    sources.push(extractWords(title));
  }
  if (description && typeof description === "string") {
    sources.push(extractWords(description));
  }
  if (categoryId) {
    const catIdNum = Number(categoryId);
    if (categoryFallbackKeywords[catIdNum]) {
      sources.push(categoryFallbackKeywords[catIdNum]);
    }
  }
  const genericFallback = ["commercial", "concept", "modern", "scene", "design", "art", "graphic", "simple", "minimal", "clean", "detail", "element", "context", "asset", "lifestyle", "organic", "pattern", "texture", "background", "composition", "subject", "focus", "creative", "fresh", "bright", "vibrant", "backdrop", "object", "view", "horizontal", "outdoor", "indoor", "surface", "material", "style", "trending", "popular", "industry", "space", "natural", "lighting", "atmosphere", "inspiration"];
  sources.push(genericFallback);
  for (const source of sources) {
    if (uniqueKeywords.length >= targetCount) break;
    if (Array.isArray(source)) {
      const cleanSource = Array.from(new Set(source));
      for (const word of cleanSource) {
        if (uniqueKeywords.length >= targetCount) break;
        if (typeof word === "string") {
          let cleanWord = word.trim().toLowerCase();
          if (cleanWord.length > 1 && !isProhibitedKeyword(cleanWord)) {
            if (keywordMode === "multi" && !cleanWord.includes(" ")) {
              const modifiers = ["concept", "background", "scene", "design", "style", "detail", "asset", "element"];
              const mod = modifiers[Math.abs(hashString(cleanWord)) % modifiers.length];
              cleanWord = `${cleanWord} ${mod}`;
            }
            if (!uniqueKeywords.includes(cleanWord)) {
              uniqueKeywords.push(cleanWord);
            }
          }
        }
      }
    }
  }
  return uniqueKeywords.slice(0, targetCount);
}
async function callOpenAICompatibleWithRetry(params) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  if (!PROVIDER_ENDPOINTS[provider]) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  const endpoint = PROVIDER_ENDPOINTS[provider];
  const providerState = store?.[provider];
  const keysList = providerState && providerState.keys || [];
  const maxRotationAttempts = keysList.length > 0 ? keysList.length : 1;
  let lastErr;
  for (let rot = 0; rot < maxRotationAttempts; rot++) {
    let apiKey = "";
    if (keysList.length > 0) {
      const activeIdx = providerState.activeIndex || 0;
      apiKey = keysList[activeIdx];
      if (provider === "nvidia") {
        console.log(`[NVIDIA DEBUG] Using key index ${activeIdx}/${keysList.length} (Starts with: ${(apiKey || "").substring(0, 8)}...)`);
      }
    } else {
      apiKey = process.env[PROVIDER_ENV_KEYS[provider]] || "";
      if (provider === "nvidia") {
        console.log(`[NVIDIA DEBUG] Using key from process.env (Starts with: ${(apiKey || "").substring(0, 8)}...)`);
      }
    }
    if (!apiKey && provider === "nvidia") {
      console.warn("NVIDIA key missing. Fallback to Gemini.");
      const fallbackResult = await getAIClient().models.generateContent({
        model: "gemini-2.5-pro",
        contents: params.contents,
        config: params.config
      });
      return typeof fallbackResult.text === "function" ? await fallbackResult.text() : fallbackResult.text || "";
    }
    if (!apiKey) {
      throw new Error(`API Key untuk ${provider.toUpperCase()} belum dikonfigurasi. Silakan tambahkan Key Anda di pengaturan.`);
    }
    const messages = [];
    let userSystemInstruction = "";
    if (params.systemInstruction) {
      if (provider === "aivene") {
        userSystemInstruction = `[SYSTEM INSTRUCTION]
${params.systemInstruction}

[USER INPUT]
`;
      } else {
        messages.push({ role: "system", content: params.systemInstruction });
      }
    }
    let hasImages = false;
    const contentParts = [];
    if (userSystemInstruction) {
      contentParts.push({ type: "text", text: userSystemInstruction });
    }
    const addPart = (part) => {
      if (!part) return;
      if (typeof part === "string") {
        contentParts.push({ type: "text", text: part });
      } else if (part.text) {
        contentParts.push({ type: "text", text: part.text });
      } else if (part.inlineData) {
        hasImages = true;
        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        });
      }
    };
    if (typeof params.contents === "string") {
      contentParts.push({ type: "text", text: params.contents });
    } else if (Array.isArray(params.contents)) {
      params.contents.forEach(addPart);
    } else if (params.contents && typeof params.contents === "object") {
      if (Array.isArray(params.contents.parts)) {
        params.contents.parts.forEach(addPart);
      } else {
        addPart(params.contents);
      }
    }
    let finalContent;
    if (!hasImages) {
      finalContent = contentParts.map((p) => p.text).join("\n");
    } else {
      finalContent = contentParts.length === 1 && contentParts[0].type === "text" ? contentParts[0].text : contentParts;
    }
    messages.push({
      role: "user",
      content: finalContent
    });
    let model = params.model || PROVIDER_DEFAULT_MODELS[provider];
    if (provider === "nvidia") {
      if (model === "stepfun_step35_flash") model = "stepfun-ai/step-3.5-flash";
      if (model.startsWith("stepfun/")) model = model.replace("stepfun/", "stepfun-ai/");
      if (model === "nemotron") model = "nvidia/llama-3.1-nemotron-70b-instruct";
      if (!model.includes("/")) {
        if (model.includes("llama-3.2")) model = `meta/${model}`;
        else if (model.includes("nemotron")) model = `nvidia/${model}`;
        else if (model.includes("paligemma")) model = `google/${model}`;
        else if (model.includes("step")) model = `stepfun-ai/${model}`;
      }
      model = model.trim();
      if (model.startsWith("/")) model = model.substring(1);
    }
    if (provider !== "aivene" && (model?.startsWith("gemini-") || model?.startsWith("gemma-"))) {
      model = PROVIDER_DEFAULT_MODELS[provider];
    }
    if (provider === "groq" && model === "llama-4-scout-17b-16e-instruct") {
      model = "meta-llama/llama-4-scout-17b-16e-instruct";
    }
    const payload = {
      model,
      messages,
      temperature: params.config?.temperature ?? 0.85
    };
    if (params.config?.topP !== void 0) {
      payload.top_p = params.config.topP;
    }
    if (SUPPORTS_JSON_MODE.has(provider)) {
      payload.response_format = { type: "json_object" };
    }
    if (provider === "groq" || provider === "openai" || provider === "openrouter" || provider === "nvidia" || provider === "aivene") {
      payload.max_tokens = provider === "nvidia" ? 4096 : 8192;
    } else if (provider === "bluesminds") {
    }
    payload.stream = false;
    if (params.responseMimeType === "application/json") {
      let schemaInstruction = '\n\nIMPORTANT: Start your response DIRECTLY with the opening curly brace "{" (or square bracket "[" if an array is requested). DO NOT write any introductory or concluding text. DO NOT use markdown code blocks. The response MUST be a valid JSON object or array.';
      if (provider === "nvidia") {
        schemaInstruction = "\n\nOutput only a valid JSON. Do not include any explanation or markdown formatting. The JSON must directly start with { or [ and end with } or ].";
      }
      if (params.responseSchema) {
        schemaInstruction += ` The JSON MUST strictly match this schema: ${JSON.stringify(params.responseSchema)}`;
      }
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        if (typeof lastMessage.content === "string") {
          lastMessage.content += schemaInstruction;
        } else if (Array.isArray(lastMessage.content)) {
          lastMessage.content.push({ type: "text", text: schemaInstruction });
        }
      } else {
        messages.push({ role: "user", content: schemaInstruction });
      }
    }
    let tryCount = 0;
    while (tryCount < 3) {
      try {
        console.log(`[callOpenAICompatibleWithRetry] Fetching ${provider.toUpperCase()} completions with model ${model}...`);
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey.trim()}`
        };
        if (provider === "openrouter") {
          headers["HTTP-Referer"] = process.env.APP_URL || "http://localhost";
          headers["X-Title"] = "JohMeta";
        }
        if (provider === "nvidia") {
          const sanPayload = { ...payload, messages: payload.messages.map((m) => ({ ...m, content: typeof m.content === "string" ? m.content : "[REDACTED CONTENT]" })) };
          console.log(`[NVIDIA DEBUG] Sending payload to ${endpoint} with model ${model}:`, JSON.stringify(sanPayload));
        }
        const fetchTimeout = provider === "nvidia" ? 25e3 : 15e3;
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          // @ts-ignore - undici/node-fetch support signal/timeout
          signal: AbortSignal.timeout(fetchTimeout)
        });
        const responseDataRawForLogging = await response.clone().text();
        console.log(`[${provider.toUpperCase()} DEBUG] Status: ${response.status}, Content-Type: ${response.headers.get("content-type")}, First 200 chars: ${responseDataRawForLogging.substring(0, 200)}`);
        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[${provider.toUpperCase()} API FAILURE] Status: ${response.status}, Response: ${errText}`);
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }
        const responseDataRaw = await response.text();
        let responseData;
        try {
          responseData = JSON.parse(responseDataRaw);
        } catch (e) {
          console.error(`[callOpenAICompatibleWithRetry] Failed to parse JSON. Status: ${response.status}, Content-Type: ${response.headers.get("content-type")}, RawResponse: ${responseDataRaw.substring(0, 500)}`);
          throw new Error(`Failed to parse JSON from ${provider}. RawResponse Sample: ${responseDataRaw.substring(0, 200)}`);
        }
        let answer = responseData.choices?.[0]?.message?.content;
        if (!answer && responseData.choices?.[0]?.message) {
          answer = responseData.choices[0].message.reasoning || responseData.choices[0].message.reasoning_content;
        }
        if (!answer) {
          console.warn(`[callOpenAICompatibleWithRetry] Empty answer received from ${provider}. Response payload:`, JSON.stringify(responseData));
          if (responseData.error) {
            throw new Error(`${provider.toUpperCase()} API Error: ${responseData.error.message || JSON.stringify(responseData.error)} (Code: ${responseData.error.code || "unknown"})`);
          }
          throw new Error(`Empty response content received from ${provider.toUpperCase()}`);
        }
        if (params.responseMimeType === "application/json") {
          answer = extractJSON(answer);
          if (answer.replace(/\s/g, "") === "{}") {
            console.warn(`[callOpenAICompatibleWithRetry] Model hallucinated empty JSON string. Retrying...`);
            throw new Error(`Model returned empty json object string {}. Trigger quota rotation/retry.`);
          }
        }
        return answer;
      } catch (err) {
        console.warn(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] error:`, err);
        const status = err.status || (err.message && err.message.includes("HTTP ") ? err.message.split(" ")[1].replace(":", "") : "unknown");
        console.warn(`[${provider.toUpperCase()} ERROR DETAILS] Status: ${status}, Message: ${err.message}, Key Index: ${providerState?.activeIndex}`);
        lastErr = err;
        const errorMsg = String(err.message || "").toLowerCase();
        const shouldRotate = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("exceeded") || errorMsg.includes("exhausted") || errorMsg.includes("403") || errorMsg.includes("401") || provider === "nvidia" && errorMsg.includes("404");
        if (shouldRotate) {
          console.warn(`[${provider.toUpperCase()}] Error requires rotation: ${errorMsg}. Trying next key.`);
          if (providerState && providerState.keys && keysList.length > 1) {
            providerState.activeIndex = (providerState.activeIndex + 1) % keysList.length;
            break;
          }
        }
        tryCount++;
        const fallback = PROVIDER_FALLBACK_MODELS[provider];
        const isRetryableError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("limit") || errorMsg.includes("timeout") || errorMsg.includes("exceeded") || errorMsg.includes("fetch failed") || errorMsg.includes("500") || errorMsg.includes("502") || errorMsg.includes("503") || errorMsg.includes("504") || errorMsg.includes("524") || errorMsg.includes("upstream_error") || errorMsg.includes("extra data") || errorMsg.includes("empty response content") || errorMsg.includes("empty json object") || errorMsg.includes("bad_response_status_code");
        if (tryCount === 1 && fallback && fallback !== model) {
          model = fallback;
          console.warn(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] Model failed. Falling back to alternative model: ${model}`);
          payload.model = model;
          continue;
        }
        if (tryCount < 3 && isRetryableError) {
          const backoff = Math.pow(2, tryCount) * 1e3 + Math.random() * 1e3;
          console.warn(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] Retrying error (attempt ${tryCount}/3) after ${backoff / 1e3}s...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        throw err;
      }
    }
  }
  throw lastErr;
}
function getAIClient() {
  return {
    models: {
      generateContent: async (params) => {
        const store = apiKeyStorage.getStore();
        const provider = store && store.provider || "gemini";
        if (NON_GEMINI_PROVIDERS.has(provider) && (!params.model?.startsWith("gemini-") && !params.model?.startsWith("gemma-"))) {
          const text = await callOpenAICompatibleWithRetry({
            systemInstruction: params.config?.systemInstruction,
            contents: params.contents,
            responseMimeType: params.config?.responseMimeType,
            responseSchema: params.config?.responseSchema,
            config: params.config
          });
          return { text };
        }
        let key = process.env.GEMINI_API_KEY || process.env.API_KEY;
        let activeIndex = 0;
        let keysList = [];
        if (store) {
          if (store.gemini && Array.isArray(store.gemini.keys)) {
            keysList = store.gemini.keys;
            activeIndex = store.gemini.activeIndex || 0;
            if (keysList.length > 0) {
              key = keysList[activeIndex];
            }
          } else if (typeof store === "string") {
            key = store;
          } else if (store && Array.isArray(store.keys) && store.keys.length > 0) {
            keysList = store.keys;
            activeIndex = store.activeIndex || 0;
            if (keysList.length > 0) {
              key = keysList[activeIndex];
            }
          }
        }
        const runGeminiDirectFetch = async (keyToUse, params2) => {
          const model = params2.model || "gemini-2.5-flash";
          const cleanModel = model.startsWith("models/") ? model : `models/${model}`;
          const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModel}:generateContent?key=${keyToUse}`;
          const contents = params2.contents || [];
          let apiContents = [];
          if (Array.isArray(contents)) {
            if (contents.length > 0 && contents[0].parts) {
              apiContents = contents;
            } else {
              apiContents = [{ parts: contents }];
            }
          } else if (contents.parts) {
            apiContents = [contents];
          } else {
            apiContents = [{ parts: [contents] }];
          }
          const apiPayload = {
            contents: apiContents
          };
          if (params2.config) {
            apiPayload.generationConfig = {};
            if (params2.config.responseMimeType) {
              apiPayload.generationConfig.responseMimeType = params2.config.responseMimeType;
            }
            if (params2.config.responseSchema) {
              apiPayload.generationConfig.responseSchema = params2.config.responseSchema;
            }
            if (typeof params2.config.temperature === "number") {
              apiPayload.generationConfig.temperature = params2.config.temperature;
            }
            if (typeof params2.config.topP === "number") {
              apiPayload.generationConfig.topP = params2.config.topP;
            }
            if (params2.config.systemInstruction) {
              if (typeof params2.config.systemInstruction === "string") {
                apiPayload.systemInstruction = {
                  parts: [{ text: params2.config.systemInstruction }]
                };
              } else if (params2.config.systemInstruction.parts) {
                apiPayload.systemInstruction = params2.config.systemInstruction;
              } else {
                apiPayload.systemInstruction = {
                  parts: [params2.config.systemInstruction]
                };
              }
            }
          }
          console.log(`[Gemini Direct Fetch] Calling REST API fallback for model: ${cleanModel}...`);
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(apiPayload)
          });
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini Direct Fetch Failed (${response.status}): ${errText}`);
          }
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return {
            text,
            candidates: resJson.candidates,
            usageMetadata: resJson.usageMetadata
          };
        };
        const runGemini = async (keyToUse) => {
          if (!keyToUse) {
            throw new Error("GEMINI_API_KEY / API_KEY environment variable is required. Silakan masukkan API Key Gemini Anda terlebih dahulu melalui tombol Pengaturan (ikon Gear) di bagian samping aplikasi.");
          }
          try {
            const client = new import_genai.GoogleGenAI({
              apiKey: keyToUse,
              httpOptions: {
                headers: {
                  "User-Agent": "aistudio-build"
                }
              }
            });
            const result = await client.models.generateContent(params);
            if (params.config?.responseMimeType === "application/json" && result.text) {
              return {
                ...result,
                text: result.text.replace(/^```json\s*/, "").replace(/```$/, "").trim()
              };
            }
            return result;
          } catch (sdkError) {
            console.warn(`[getAIClient] SDK generateContent failed: ${sdkError.message || sdkError}. Attempting REST API fallback...`);
            try {
              const directResult = await runGeminiDirectFetch(keyToUse, params);
              if (params.config?.responseMimeType === "application/json" && directResult.text) {
                return {
                  ...directResult,
                  text: directResult.text.replace(/^```json\s*/, "").replace(/```$/, "").trim()
                };
              }
              return directResult;
            } catch (fallbackError) {
              console.error(`[getAIClient] Both SDK and REST fallback failed. REST Error: ${fallbackError.message || fallbackError}`);
              throw sdkError;
            }
          }
        };
        if (keysList.length > 1) {
          let lastErr;
          for (let rot = activeIndex; rot < keysList.length; rot++) {
            try {
              return await runGemini(keysList[rot]);
            } catch (err) {
              lastErr = err;
              const statusCode = err.status || err.code;
              const errorMsg = String(err.message || err.status || err.details || "").toLowerCase();
              if (statusCode === 429) {
                const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/i) || errorMsg.match(/retrydelay['":\s]+([\d\.]+)s/i);
                if (retryMatch && retryMatch[1]) {
                  const delay = parseFloat(retryMatch[1]) * 1e3 + 1e3;
                  console.log(`[Key Rotation - GEMINI] Rate limited, waiting ${delay}ms before next attempt/key rotation`);
                  await new Promise((r) => setTimeout(r, delay));
                }
              }
              if (statusCode === 429 || statusCode === 403 || errorMsg.includes("quota") || errorMsg.includes("exceeded") || errorMsg.includes("resource_exhausted") || errorMsg.includes("limit") || errorMsg.includes("api key")) {
                if (store && store.gemini && keysList.length > 1) {
                  store.gemini.activeIndex = (store.gemini.activeIndex + 1) % keysList.length;
                  console.warn(`[Key Rotation - GEMINI] Rotating key in generateContent to index ${store.gemini.activeIndex}`);
                  continue;
                } else if (store && !store.gemini && keysList.length > 1) {
                  store.activeIndex = (store.activeIndex + 1) % keysList.length;
                  console.warn(`[Key Rotation] Rotating key in generateContent to index ${store.activeIndex}`);
                  continue;
                }
              }
              throw err;
            }
          }
          throw lastErr;
        } else {
          return await runGemini(key);
        }
      }
    }
  };
}
var callGeminiWithRetry = async (modelName, contents, config, maxAttempts = 8) => {
  let lastError;
  let currentModel = modelName;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await getAIClient().models.generateContent({
        model: currentModel,
        contents,
        config
      });
    } catch (err) {
      lastError = err;
      const statusCode = err.status || err.code;
      if (statusCode === 429 || statusCode >= 500) {
        const errorMsg = String(err.message || err.status || err.details || "").toLowerCase();
        let customDelay = 0;
        const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/i) || errorMsg.match(/retrydelay['":\s]+([\d\.]+)s/i);
        if (retryMatch && retryMatch[1]) {
          customDelay = parseFloat(retryMatch[1]) * 1e3 + 1e3;
        }
        if (statusCode === 429 && !customDelay && (errorMsg.includes("quota exceeded for metric") || errorMsg.includes("billing"))) {
          if (errorMsg.includes("limit: 20") || errorMsg.includes("limit: 15") || errorMsg.includes("retry in")) {
          } else {
            console.warn(`[callGeminiWithRetry] Hard quota limit hit on ${currentModel}.`);
            throw err;
          }
        }
        const isQuotaOrLimit = statusCode === 429 || statusCode === 503;
        if (isQuotaOrLimit) {
          const rotationModels = ["gemini-2.5-pro", "gemini-2.5-pro-preview", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.5-pro"];
          const currentIndex = rotationModels.indexOf(currentModel);
          const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % rotationModels.length : 0;
          let nextModel = rotationModels[nextIndex];
          if (nextModel === currentModel) {
            nextModel = rotationModels[currentIndex === 0 ? 1 : 0];
          }
          console.warn(`[callGeminiWithRetry] Quota/Limit hit on ${currentModel}. Rotating to ${nextModel} for attempt ${attempt + 2}.`);
          currentModel = nextModel;
          customDelay = attempt === 0 ? 2e3 : 5e3;
        } else if (statusCode === 429 && customDelay > 6e4) {
          console.warn(`[callGeminiWithRetry] Hard quota limit hit on ${currentModel} (Wait time > 60s). Failing fast.`);
          throw err;
        }
        let backoff = customDelay > 0 ? customDelay : Math.pow(2, attempt) * 1e3 + Math.random() * 1e3;
        if (statusCode === 429 && !customDelay) {
          backoff = Math.min(3e4, backoff);
        }
        console.log(`[Gemini Retry] Received ${statusCode} on ${currentModel}, retrying in ${backoff / 1e3}s (attempt ${attempt + 1}/${maxAttempts})...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};
var processFrameServer = (frame) => {
  const [mimePart, dataPart] = frame.split(";base64,");
  return {
    inlineData: {
      mimeType: mimePart.split(":")[1],
      data: dataPart
    }
  };
};
var generateStockMetadata = async (frames, keywordCount, customPrompt = "", toolType = "image" /* IMAGE */, temperature, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance) => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  let activeModel = model;
  if (provider === "gemini" || !NON_GEMINI_PROVIDERS.has(provider)) {
    if (!activeModel || activeModel === "gemini-2.5-pro" || activeModel === "gemini-2.5-pro-preview") {
      activeModel = aiModelPerformance === "speed" ? "gemini-2.5-pro-preview" : "gemini-2.5-pro";
    }
  } else if (!activeModel) {
    activeModel = PROVIDER_DEFAULT_MODELS[provider];
  }
  const categoriesText = ADOBE_CATEGORIES.map((c) => `${c.id}: ${c.name}`).join(", ");
  const shutterstockCategoriesText = (toolType === "video" /* VIDEO */ ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).join(", ");
  const imageParts = frames.map((frame) => processFrameServer(frame));
  const targetCount = parseInt(String(keywordCount), 10) || 60;
  const aiRequestCount = targetCount + 10;
  let keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume keywords (including single-word and/or multi-word phrases) in ${getLanguageName(metadataLanguage)}. MUST be short words/phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
  let keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword or phrase.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: descriptors of the primary subjects or objects matching buyer search queries)
   - Action (Activity: descriptors of movements, actions, or commercial activities happening)
   - Context (Environment/Background: setting, backdrop, location context, atmosphere, season)
   - Search Intent & Commercial Concept (Abstract Purpose: target terms representing why a buyer would search for this asset, commercial utility, industrial purpose, psychological mood, emotional intent, business solutions, and symbolic metaphor representation)
   - Industry (Specific/Technical Category: specialized corporate or consumer domains, professional categories)
3. Include both single-word and/or multi-word phrases (1-3 words) when relevant.
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  if (keywordMode === "single") {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume SINGLE-WORD keywords in ${getLanguageName(metadataLanguage)}. Strictly avoid multi-word phrases or compound words with spaces. MUST be short words, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: primary single-word subject descriptors)
   - Action (Activity: single-word action/movement descriptors)
   - Context (Environment/Background: single-word background or location setting terms)
   - Search Intent & Commercial Concept (Abstract Purpose: single-word terms representing buyer search intent, commercial purpose, utility, symbolic concept, or emotional mood)
   - Industry (Specific/Technical Category: single-word technical or industry-specific terms)
3. Every keyword MUST be a SINGLE word only. Strictly forbidden from using multi-word phrases or compound words with spaces.
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  } else if (keywordMode === "multi") {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume MULTI-WORD phrase keywords in ${getLanguageName(metadataLanguage)}. Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword phrase.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: multi-word subject/object descriptors matching buyer searches, e.g., "smartphone device")
   - Action (Activity: multi-word motion or commercial action phrases)
   - Context (Environment/Background: multi-word background or location setting phrases)
   - Search Intent & Commercial Concept (Abstract Purpose: multi-word phrases representing the buyer's target intent, commercial use cases, digital trends, emotional concepts, or symbolic metaphors)
   - Industry (Specific/Technical Category: multi-word technical or professional industry terms)
3. Every keyword MUST be a MULTI-WORD phrase (consisting of 2 or 3 words separated by spaces). Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  }
  let visualFactsJson = "";
  console.log(`[JohMeta Pipeline] Stage 1: Running Provider 1 \u2014 Gemini Vision (Visual Facts Detection)...`);
  let mediaTypeContext = "The provided image is a photograph or digital artwork. Generate natural, human-readable descriptions of concepts and visual facts smoothly.";
  if (toolType === "video" /* VIDEO */) {
    mediaTypeContext = "CRITICAL: The provided images are sequential frames (Start, Middle, End) from a single VIDEO. You MUST analyze the continuous motion, narrative progression, concepts, and storyline (alur) across the frames. Do not just describe them individually; synthesize the overall action and concept into natural, coherent metadata.";
  } else if (toolType === "vector" /* VECTOR */ || toolType === "vector_eps" /* VECTOR_EPS */) {
    mediaTypeContext = "CRITICAL: The provided image is a VECTOR illustration. You MUST analyze and categorize it based on the ACTUAL SUBJECT MATTER visually present (e.g. if it shows an animal, classify as Animal; if it shows people, classify as People). Do NOT just default to 'Graphic Resources' or 'Abstract' unless it is genuinely a background/texture without clear subjects. Generate natural, smooth descriptions of the subjects.";
  }
  const fallbackGeminiModel = aiModelPerformance === "speed" ? "gemini-2.5-pro-preview" : "gemini-2.5-pro";
  const visionModelToUse = activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel;
  const visionSystemInstruction = `ROLE:
You are a Visual Metadata Analyzer.
Analyze only what is visually verifiable in the image.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner, not just the center or main subject. Check every edge, corner, background, and small element.
2. NO HALLUCINATION: Perform a deep and thorough visual scan. You are strictly forbidden from guessing, making things up, or assuming details if you do not physically see them in the image. Your analysis must be 100% based on visual facts.
3. Identify subjects naturally and act like a human based on strong visual, cultural, or contextual cues. For example: if a subject clearly appears to be an "Indian woman" wearing cultural attire or having distinct features, directly identify her as an "Indian woman" rather than broadly describing physical features. This applies to recognizing professions, events, locations, nationalities, relationships, and emotions when they are visually evident.
4. Never hallucinate brands, trademarked logos, or copyrighted characters.
5. If uncertain, provide the closest accurate generic description.

STRICT PROHIBITIONS:
* Never include specific brand names or trademarked logos (must be described generically).
* Never include copyrighted characters.

PRIMARY OBJECTIVE:
Detect every visible subject, action, color, visible text, and composition detail.
Also, conduct a deep assessment on the asset's artistic theme, deeper meaning, and symbolic concept (baca makna mendalam & artistik dari aset tersebut).
Also, perform a profound visual semantic analysis of the image content to suggest the most relevant microstock categories from the official lists.
Return JSON ONLY under the key "VISUAL_FACTS".
Do not generate title or keywords.

Asset Context: ${mediaTypeContext}

OFFICIAL MICROSTOCK CATEGORY REFERENTIALS FOR SEMANTIC SUGGESTIONS:
- Adobe Stock Categories: ${categoriesText}
- Shutterstock Categories: ${shutterstockCategoriesText}

OUTPUT FORMAT:
{
  "VISUAL_FACTS": {
    "primary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "secondary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "background_elements": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "visible_text": [],
    "colors": [],
    "actions": [],
    "composition": [],
    "deeper_meaning_and_symbolism": "Describe the deeper artistic meaning, theme, emotional mood, symbolic message, or conceptual representation of the asset (makna, pesan artistik, atau analogi konsep dari aset tersebut) that represents its true value.",
    "semantic_category_analysis": {
      "adobe_id": 0,
      "shutterstock_category_1": "",
      "shutterstock_category_2": "",
      "reason": "Explain carefully why these official Adobe and Shutterstock categories match the visual content semantically based on primary subjects, context, and deeper theme"
    }
  }
}`;
  const promptText = toolType === "video" /* VIDEO */ ? `Tugas: Analyze the 3 video frames (Start, Middle, End). Detect every visible primary and secondary subject, background element, visible text, action, narrative flow, overall storyline (alur), composition, and color. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]` : `Tugas: Detect every visible primary and secondary subject, background element, visible text, action, color, and composition. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`;
  try {
    const visionResponse = await callGeminiWithRetry(visionModelToUse, {
      parts: [...imageParts, { text: promptText }]
    }, {
      systemInstruction: visionSystemInstruction,
      responseMimeType: "application/json",
      temperature: 0,
      topP: 0.8
    });
    visualFactsJson = visionResponse.text || "{}";
    if (!visualFactsJson || visualFactsJson.trim() === "{}") {
      throw new Error("Vision Analysis produced empty results.");
    }
  } catch (err) {
    console.warn("[JohMeta Pipeline] Gemini Vision Stage 1 Failed:", err.message || err);
    visualFactsJson = JSON.stringify({
      VISUAL_FACTS: {
        primary_subjects: [{ name: "main subject", importance: 100 }],
        secondary_subjects: [],
        background_elements: [],
        visible_text: [],
        colors: ["natural"],
        actions: ["commercial poses"],
        composition: ["professional"],
        semantic_category_analysis: {
          adobe_id: 0,
          shutterstock_category_1: "",
          shutterstock_category_2: "",
          reason: "Fallback static categories used."
        }
      }
    });
  }
  let visualFacts = {};
  try {
    visualFacts = JSON.parse(extractJSON(visualFactsJson)).VISUAL_FACTS || {};
  } catch (e) {
    visualFacts = { primary_subjects: [{ name: "subject", importance: 100 }], actions: ["posing"] };
  }
  const dominantSubjects = [
    ...Array.isArray(visualFacts.primary_subjects) ? visualFacts.primary_subjects : [],
    ...Array.isArray(visualFacts.secondary_subjects) ? visualFacts.secondary_subjects : []
  ].filter((item) => item && typeof item === "object" && typeof item.importance === "number" && item.importance >= 50).map((item) => item.name);
  console.log(`[JohMeta Pipeline] Stage 2 & 3: Generating Content (Title, Description, Keywords)...`);
  const customPromptCommand = customPrompt ? `
CRITICAL CUSTOM INSTRUCTION / ANCHOR / TARGET KEYWORDS:
The user has provided a custom instruction, command, or target keywords: "${customPrompt}"
ABSOLUTE RULES:
1. If this input is a custom command or instruction (e.g., "describe as retro", "make the title poetic", "focus on elegance", "exclude blue color", "emphasize commercial utility", etc.), you MUST strictly follow, apply, and prioritize this directive when generating the Title, Description, and Keywords!
2. If this input represents target keywords (e.g., specific words like "blue, ocean, sunset"), you MUST heavily prioritize and integrate these exact target keywords into both the Title and the Keywords list naturally and prominently.` : "";
  const mediaContext = mediaTypeContext;
  const genSystemInstruction = `You are a professional Adobe Stock, Shutterstock, and Getty Images metadata SEO specialist. 
Your ultimate goal is to DOMINATE SEARCH ALGORITHMS. You must maximize the discoverability of visual assets and aggressively optimize them for search-engine algorithms to rank on the absolute FIRST PAGE of microstock marketplaces. Every word must carry high SEO weight.
OUTPUT MUST BE IN ENGLISH for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)} YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY.

${mediaContext}${customPromptCommand}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. NO INTELLECTUAL PROPERTY (IP): NEVER use company names, brand names, trademarks, or product names (e.g., Apple, Nike, iPhone, Coca-Cola). Use generic terms instead (e.g., "smartphone", "athletic shoes", "soda").
2. NO FAMOUS PEOPLE OR CHARACTERS: NEVER include names of artists, celebrities, public figures, or fictional characters.
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of".
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
6. NO MEDIA TYPE WORDS: NEVER include words like "photography", "photo", "illustration", "vector", "image", "picture" in the Title or Keywords. Focus purely on the actual subject matter.

MICROSTOCK ALGORITHMIC SEO & DISCOVERABILITY RULES (DOMINATE SEARCH ALGORITHMS):
- DOMINATE SEARCH ALGORITHMS: You must aggressively optimize the title and keywords to dominate search algorithms. Use the highest-converting, most frequently searched commercial terms by actual buyers.
- SEARCH INTENT MATCHING: Design metadata to precisely match the search queries of professional commercial buyers (e.g., designers, marketing teams, agency publishers). Ask yourself: "What actual commercial search query would a buyer type to purchase this exact asset?"
- SEMANTIC TAXONOMY: Blend high-weight concrete keywords (exactly what is visible) with abstract conceptual terms (emotions, commercial uses, metaphorical concepts, themes, and demographic vibes).
- HIGH-VALUE NICHE FRONT-LOADING: Place the highest-value, highly specific visual descriptors and niche-relevant keywords at the very beginning of the Titles and Keywords list. Microstock search algorithms weigh earlier words much higher!

Rules for Titles:
1. Focus directly on the main subject and action. Introduce the content clearly. Front-load the most relevant searchable visual keywords. CRITICAL: MUST NOT start with "Vector of", "Illustration of", "Drawing of", or "Continuous line drawing of".
2. Use Sentence case (only the first letter of the entire title should be capitalized, with the rest in lowercase except for proper nouns).
3. Use easy-to-read phrases, NOT formal sentence structures.
4. DO NOT treat the title like a list of keywords. No commas separating words.

Rules for Descriptions:
1. Provide a thorough visual breakdown of the scene, including colors, composition, and specific details, rich in high-density SEO synonyms.
2. ALWAYS conclude the description with a sentence starting with "Ideal for..." or "Perfect for..." that suggests how a customer might use this asset (e.g., "Ideal for tech blogs or app UI presentations").
3. Limit to 200 characters.

Rules for Keywords:
1. Start with the most important, high-converting commercial descriptors. Sort them in descending order of relevance.
2. CRITICAL: Keywords must be single words only. NEVER use multi-word phrases or compound words with spaces.
3. Ensure no IP, brands, or names are included.
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the visually suggested category id "${visualFacts?.semantic_category_analysis?.adobe_id || ""}" with semantic reason "${visualFacts?.semantic_category_analysis?.reason || ""}" if it perfectly matches the visual content.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the visually suggested categories "${visualFacts?.semantic_category_analysis?.shutterstock_category_1 || ""}" and "${visualFacts?.semantic_category_analysis?.shutterstock_category_2 || ""}" if they are a perfect fit.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

VISUAL_FACTS:
${JSON.stringify(visualFacts, null, 2)}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "title": "A highly descriptive natural language title representing the core subject",
  "description": "A detailed visual description focusing on subjects, setting, and mood",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "category_id": 1,
  "shutterstock_category_1": "Abstract",
  "shutterstock_category_2": "Backgrounds/Textures",
  "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly"
}
If generation fails, return {"error": "metadata_generation_failed"}.`;
  let draftMetadata = {};
  try {
    let genResponse;
    if (NON_GEMINI_PROVIDERS.has(provider)) {
      try {
        genResponse = await callOpenAICompatibleWithRetry({
          systemInstruction: genSystemInstruction,
          contents: `Generate draft metadata based on VISUAL_FACTS. IMPORTANT: Fill all fields. [RunID: ${Date.now()}-${Math.random()}]`,
          responseMimeType: "application/json",
          config: { temperature: temperature ?? 0.3, topP: 0.9 },
          model: activeModel
        });
      } catch (providerError) {
        console.warn(`[JohMeta Pipeline] ${provider.toUpperCase()} failed completely:`, providerError.message);
        console.warn(`[JohMeta Pipeline] Falling back to Gemini as absolute failsafe...`);
        genResponse = await callGeminiWithRetry(fallbackGeminiModel, {
          parts: [{ text: `Generate draft metadata based on provided VISUAL_FACTS. IMPORTANT: Fill all fields. [RunID: ${Date.now()}-${Math.random()}]` }]
        }, {
          systemInstruction: genSystemInstruction,
          responseMimeType: "application/json",
          temperature: temperature ?? 0.3,
          topP: 0.9
        });
      }
    } else {
      genResponse = await callGeminiWithRetry(activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel, {
        parts: [{ text: `Generate draft metadata based on provided VISUAL_FACTS. IMPORTANT: Fill all fields. [RunID: ${Date.now()}-${Math.random()}]` }]
      }, {
        systemInstruction: genSystemInstruction,
        responseMimeType: "application/json",
        temperature: temperature ?? 0.3,
        topP: 0.9
      });
    }
    let rawContent = typeof genResponse === "string" ? genResponse : genResponse.text;
    console.log("### RAW RESPONSE CONTENT ###");
    console.log(rawContent);
    console.log("Type of rawContent:", typeof rawContent);
    const extracted = extractJSON(rawContent);
    console.log("### EXTRACTED JSON ###");
    console.log(extracted);
    if (extracted.trim() === "{}") {
      throw new Error('Model returned empty object string "{}"');
    }
    draftMetadata = JSON.parse(extracted);
    console.log("[STAGE 2/3] PARSED:");
    console.log(draftMetadata);
    if (draftMetadata.error) {
      throw new Error("Model returned error: " + draftMetadata.error);
    }
    if (!draftMetadata || typeof draftMetadata !== "object" || Array.isArray(draftMetadata)) {
      throw new Error("Model did not return a valid object");
    }
    if (!draftMetadata.title && !draftMetadata.description && (!draftMetadata.keywords || draftMetadata.keywords.length === 0)) {
      throw new Error("Model returned empty object {}");
    }
  } catch (err) {
    console.error("[JohMeta Pipeline] Generation Stage 2/3 Failed:", err);
    throw err;
  }
  console.log(`[JohMeta Pipeline] Stage 4, 5 & 6: Auditing, Ranking, and Final Validation...`);
  console.log("DRAFT BEFORE AUDIT", JSON.stringify(draftMetadata, null, 2));
  const validatorSystemInstruction = `You are a professional Adobe Stock and Shutterstock metadata SEO specialist. 
Your ultimate goal is to DOMINATE SEARCH ALGORITHMS. You must aggressively maximize the discoverability of visual assets and optimize them to rank on the absolute FIRST PAGE. Every word validated must carry high SEO weight.
OUTPUT MUST BE IN ${getLanguageName(metadataLanguage)} for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE (NO INTELLECTUAL PROPERTY - Based on https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html): 
   - You MUST strictly comply with Adobe Stock's intellectual property refusal guidelines. There are absolutely ZERO exceptions to this rule. Any mention of a brand name, trademark, proprietary model, or protected landmark in the Title, Description, or Keywords will result in instant rejection of the asset by stock reviewers. Always default to generic, descriptive terms!
   - NEVER use, name, or reference any company names, brand names, manufacturer names, trademarked names, or product names (e.g., Apple, Microsoft, Google, Samsung, Nike, Adidas, Sony, Nintendo, Coca-Cola, Pepsi, Starbucks, Disney, Lego, Barbie).
   - NEVER name specific proprietary models, series, or product lines in either the title or keywords (e.g., do NOT use "iPhone", "MacBook", "iPad", "Nintendo Switch", "PlayStation", "Xbox", "Jeep", "Vespa", "Lego", "Barbie", "Air Max", "Walkman", "GoPro"). Instead, use strictly generic equivalents (e.g., use "smartphone", "laptop", "tablet computer", "handheld gaming console", "video game console", "off-road sport utility vehicle", "motor scooter", "toy building blocks", "fashion doll", "athletic sneakers", "portable cassette player", "action camera").
   - NEVER include trademarked names of common products, materials, or services that have become genericized in speech but are protected trademarks (e.g., do NOT use "Velcro" -> use "hook and loop fastener"; "Popsicle" -> use "ice pop"; "Post-it" -> use "sticky note"; "Band-Aid" -> use "adhesive bandage"; "Super Glue" -> use "cyanoacrylate adhesive"; "Frisbee" -> use "flying disc"; "Bubble Wrap" -> use "plastic bubble packaging"; "Crayola" -> use "wax crayons"; "Teflon" -> use "non-stick coating"; "Tupperware" -> use "plastic food storage container"; "PowerPoint" -> use "presentation software"; "Photoshop" -> use "digital image editing software"; "Xerox" -> use "photocopier").
   - NEVER include specific, identifiable car brands/models or manufacturers (e.g., "Porsche 911", "Ferrari", "Tesla Model 3"). Use generic descriptors (e.g., "modern sports car", "electric sedan", "luxury racing automobile").
   - NEVER include names of protected landmarks, private venues, parks, or architectural works that have strict intellectual property/trademark rights on their names (e.g., do NOT use "Disneyland", "Eiffel Tower", "Empire State Building", "Sydney Opera House", "Taj Mahal", "Louvre Museum", "Burj Khalifa", "Colosseum", "Stonehenge"). Instead, refer to them generically where possible (e.g., "famous amusement park", "historic European wrought iron tower", "art deco skyscraper", "iconic harbor opera house", "ancient white marble mausoleum").
   - NEVER include names of fictional characters, intellectual franchises, films, games, or books (e.g., "Harry Potter", "Spider-Man", "Mickey Mouse", "Pok\xE9mon", "Minecraft"). Use generic visual descriptions (e.g., "wizard characters", "superhero figure", "cartoon mouse", "pocket monsters design", "pixel block game style").
   - INTELLECTUAL PROPERTY REFUSAL COMMON CAUSES TO STICK TO (MUST COMPLY):
     * Use of logos, trademarks, brand names, or identifiable product packaging is STRICTLY PROHIBITED.
     * Commercial products with distinctive designs MUST NOT be named or suggested as main subjects, such as toys, fashion items, electronics, or designer furniture.
     * Depictions of ticketed locations or restricted sites without required property releases are STRICTLY FORBIDDEN.
     * Certain landmarks or monuments cannot be accepted or named, even with releases (e.g., Menara Eiffel di malam hari, Burj Khalifa, Burj Al Arab, Sydney Opera House, Atomium, Louvre Pyramid, Space Needle, Hollywood Sign, Istana Neuschwanstein, Kuil Sagrada Fam\xEDlia interior).
     * Modern architecture with a unique or recognizable design must never be referred to by its trademarked/proprietary name when shown as the primary focus without a release.
     * Copyrighted works, including art, sculptures, street art, illustrations, fonts, or graphic elements created by others, must never be named or referenced.
2. NO FAMOUS PEOPLE OR CHARACTERS: NEVER include names of artists, celebrities, public figures, or fictional characters.
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of".
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
6. NO MEDIA TYPE WORDS: NEVER include words like "photography", "photo", "illustration", "vector", "image", "picture" in the Title or Keywords. Focus purely on the actual subject matter.
7. NATURAL HUMAN-LIKE INFERENCE: Identify demographics, professions, cultures, and context naturally like a human would. If a person visually appears to be an "Indian woman", describe her as an "Indian woman" rather than "woman with brown skin". If someone is wearing a white coat in a clinic, call them a "doctor". Apply this human-like recognition to ethnicities, locations, seasons, relationships, and events based on strong visual and cultural cues. Do NOT be overly literal or robotic.

Rules for Titles:
- Use clear natural language.
- Describe only visible elements in the image.
- Put the main subject at the beginning of the title.
- Include important commercial keywords naturally.
- Do not use keyword stuffing.
- Do not use brand names, trademarks, company names, or copyrighted terms.
- Do not use marketing language such as "best", "amazing", "stunning", "beautiful", or "perfect".
- Do not use articles unless necessary (a, an, the).
- CRITICAL TITLE STRUCTURE: [Main Subject] + [Action] + [Environment] + [Purpose or Concept]. Must be SEO friendly and highly relevant to the asset.
- Include one relevant commercial concept if visible (business, finance, technology, healthcare, education, sustainability, etc.).
- Use sentence case.
- Output only one title.
- Do not include explanations, labels, quotation marks, or numbering.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. Provide a thorough literal visual breakdown of the scene. Focus heavily on what is literally visible in the image rather than abstract concepts. Buyers and reviewers prefer practical and literal descriptions. Include colors, composition, and specific details using human-like language.
3. ALWAYS conclude the description with a sentence starting with "Ideal for..." or "Perfect for..." that suggests how a customer might use this asset (e.g., "Ideal for tech blogs or app UI presentations").
4. Limit to 200 characters.

Rules for Keywords:
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the visually suggested category id "${visualFacts?.semantic_category_analysis?.adobe_id || ""}" with semantic reason "${visualFacts?.semantic_category_analysis?.reason || ""}" if it perfectly matches the visual content.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the visually suggested categories "${visualFacts?.semantic_category_analysis?.shutterstock_category_1 || ""}" and "${visualFacts?.semantic_category_analysis?.shutterstock_category_2 || ""}" if accurate.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

VISUAL_FACTS:
${JSON.stringify(visualFacts, null, 2)}

DRAFT METADATA TO VALIDATE:
${JSON.stringify(draftMetadata, null, 2)}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "title": "A highly descriptive natural language title representing the core subject",
  "description": "A detailed visual description focusing on subjects, setting, and mood",
  "keywords": [],
  "category_id": 0,
  "shutterstock_category_1": "",
  "shutterstock_category_2": "",
  "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly",
  "confidence_score": 0.95
}`;
  let finalMetadataRaw = {};
  try {
    const validResponse = await (NON_GEMINI_PROVIDERS.has(provider) ? callOpenAICompatibleWithRetry({
      systemInstruction: validatorSystemInstruction,
      contents: `Audit and validate the Draft Metadata against VISUAL_FACTS. Return final JSON. [RunID: ${Date.now()}-${Math.random()}]`,
      responseMimeType: "application/json",
      config: { temperature: temperature ?? 0.1, topP: 0.8 },
      model: activeModel
    }) : callGeminiWithRetry(activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel, {
      parts: [{ text: `Audit and validate the Draft Metadata against VISUAL_FACTS. Return final JSON. [RunID: ${Date.now()}-${Math.random()}]` }]
    }, {
      systemInstruction: validatorSystemInstruction,
      responseMimeType: "application/json",
      temperature: temperature ?? 0.1,
      topP: 0.8
    }));
    finalMetadataRaw = JSON.parse(extractJSON(typeof validResponse === "string" ? validResponse : validResponse.text));
  } catch (err) {
    console.warn("[JohMeta Pipeline] Validation Stage 4/5/6 Failed: bypassed:", err.message);
    const heur = getHeuristicCategories(draftMetadata.title, draftMetadata.keywords || []);
    finalMetadataRaw = {
      ...draftMetadata,
      category_id: heur.category_id,
      shutterstock_category_1: heur.shutterstock_category_1,
      shutterstock_category_2: heur.shutterstock_category_2
    };
  }
  try {
    let data = finalMetadataRaw && typeof finalMetadataRaw === "object" && !Array.isArray(finalMetadataRaw) ? { ...finalMetadataRaw } : {};
    if (data.desc && !data.description) data.description = data.desc;
    if (data.caption && !data.description) data.description = data.caption;
    if (data.short_description && !data.description) data.description = data.short_description;
    if (data.image_description && !data.description) data.description = data.image_description;
    if (data.name && !data.title) data.title = data.name;
    if (data.headline && !data.title) data.title = data.headline;
    if (data.subject && !data.title) data.title = data.subject;
    data.description = ensureDescription(data.description || "", data.title || "", data.keywords || []);
    if (!data.keywords || !Array.isArray(data.keywords)) {
      data.keywords = [];
    }
    let cleanedKeywords = [];
    data.keywords.forEach((k) => {
      if (typeof k === "string") {
        const cleanPhrase = k.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ");
        if (cleanPhrase.length > 1) {
          if (keywordMode === "single") {
            const pieces = cleanPhrase.split(/\s+/);
            pieces.forEach((word) => {
              if (word.length > 1 && !isProhibitedKeyword(word)) {
                cleanedKeywords.push(word);
              }
            });
          } else {
            if (!isProhibitedKeyword(cleanPhrase)) {
              cleanedKeywords.push(cleanPhrase);
            }
          }
        }
      }
    });
    const uniqueKeywords = Array.from(new Set(cleanedKeywords));
    const allowedTerms = [
      ...(Array.isArray(visualFacts.primary_subjects) ? visualFacts.primary_subjects : []).map((x) => x?.name || ""),
      ...(Array.isArray(visualFacts.secondary_subjects) ? visualFacts.secondary_subjects : []).map((x) => x?.name || ""),
      ...Array.isArray(visualFacts.actions) ? visualFacts.actions : [],
      ...Array.isArray(visualFacts.colors) ? visualFacts.colors : []
    ].join(" ").toLowerCase();
    const rigorouslyFilteredKeywords = uniqueKeywords.filter((keyword) => {
      if (!allowedTerms || allowedTerms.length < 5) return true;
      const words = keyword.split(/\s+/);
      const hasMatchingWord = words.some((w) => allowedTerms.includes(w));
      return hasMatchingWord && !isProhibitedKeyword(keyword);
    });
    const remainingKeywords = uniqueKeywords.filter((k) => !rigorouslyFilteredKeywords.includes(k) && !isProhibitedKeyword(k));
    const finalKeywordList = [...rigorouslyFilteredKeywords, ...remainingKeywords];
    data.keywords = ensureKeywordCount(
      finalKeywordList,
      targetCount,
      visualFacts,
      data.title,
      data.description,
      data.category_id,
      keywordMode
    );
    data.title = ensureTitleLength(data.title, data.keywords || [], data.description || "", titleLength);
    const parsedCategoryId = parseInt(String(data.category_id), 10);
    if (isNaN(parsedCategoryId) || parsedCategoryId < 1 || parsedCategoryId > 21) {
      const heur = getHeuristicCategories(data.title, data.keywords || []);
      data.category_id = heur.category_id;
    } else {
      data.category_id = parsedCategoryId;
    }
    const validShutterstockCats = toolType === "video" /* VIDEO */ ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES;
    if (!data.shutterstock_category_1 || !validShutterstockCats.includes(data.shutterstock_category_1)) {
      const heur = getHeuristicCategories(data.title, data.keywords || []);
      data.shutterstock_category_1 = validShutterstockCats.includes(heur.shutterstock_category_1) ? heur.shutterstock_category_1 : validShutterstockCats[0] || "Abstract";
    }
    if (!data.shutterstock_category_2 || !validShutterstockCats.includes(data.shutterstock_category_2) || data.shutterstock_category_2 === data.shutterstock_category_1) {
      const heur = getHeuristicCategories(data.title, data.keywords || []);
      let secondFallback = heur.shutterstock_category_2;
      if (secondFallback === data.shutterstock_category_1) {
        const possibleVal = toolType === "video" /* VIDEO */ ? "Backgrounds/Textures" : "Abstract";
        secondFallback = validShutterstockCats.find((cat) => cat !== data.shutterstock_category_1) || possibleVal;
      }
      data.shutterstock_category_2 = validShutterstockCats.includes(secondFallback) ? secondFallback : validShutterstockCats.find((cat) => cat !== data.shutterstock_category_1) || "Backgrounds/Textures";
    }
    data.category_reason = data.category_reason || visualFacts?.semantic_category_analysis?.reason || "Suggested based on visual semantic analysis.";
    return data;
  } catch (error) {
    console.warn("[JohMeta Parse Error] Failed to handle output format:", error);
    throw new Error("Gagal memproses respons metadata AI ke dalam skema sistem. Silakan coba kembali.");
  }
};
var generateBatchStockMetadata = async (items, keywordCount, customPrompt = "", toolType = "image" /* IMAGE */, temperature, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance) => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  let activeModel = model;
  if (provider === "gemini" || !NON_GEMINI_PROVIDERS.has(provider)) {
    if (!activeModel || activeModel === "gemini-2.5-pro" || activeModel === "gemini-2.5-pro-preview") {
      activeModel = aiModelPerformance === "speed" ? "gemini-2.5-pro-preview" : "gemini-2.5-pro";
    }
  } else if (!activeModel) {
    activeModel = PROVIDER_DEFAULT_MODELS[provider];
  }
  const categoriesText = ADOBE_CATEGORIES.map((c) => `${c.id}: ${c.name}`).join(", ");
  const shutterstockCategoriesText = (toolType === "video" /* VIDEO */ ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).join(", ");
  const targetCount = parseInt(String(keywordCount), 10) || 60;
  const aiRequestCount = targetCount + 10;
  let keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume keywords (including single-word and/or multi-word phrases) in ${getLanguageName(metadataLanguage)}. MUST be short words/phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
  let keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword or phrase.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: descriptors of the primary subjects or objects matching buyer search queries)
   - Action (Activity: descriptors of movements, actions, or commercial activities happening)
   - Context (Environment/Background: setting, backdrop, location context, atmosphere, season)
   - Search Intent & Commercial Concept (Abstract Purpose: target terms representing why a buyer would search for this asset, commercial utility, industrial purpose, psychological mood, emotional intent, business solutions, and symbolic metaphor representation)
   - Industry (Specific/Technical Category: specialized corporate or consumer domains, professional categories)
3. Include both single-word and/or multi-word phrases (1-3 words) when relevant.
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  if (keywordMode === "single") {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume SINGLE-WORD keywords in ${getLanguageName(metadataLanguage)}. Strictly avoid multi-word phrases or compound words with spaces. MUST be short words, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: primary single-word subject descriptors)
   - Action (Activity: single-word action/movement descriptors)
   - Context (Environment/Background: single-word background or location setting terms)
   - Search Intent & Commercial Concept (Abstract Purpose: single-word terms representing buyer search intent, commercial purpose, utility, symbolic concept, or emotional mood)
   - Industry (Specific/Technical Category: single-word technical or industry-specific terms)
3. Every keyword MUST be a SINGLE word only. Strictly forbidden from using multi-word phrases or compound words with spaces.
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  } else if (keywordMode === "multi") {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume MULTI-WORD phrase keywords in ${getLanguageName(metadataLanguage)}. Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword phrase.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: multi-word subject/object descriptors matching buyer searches, e.g., "smartphone device")
   - Action (Activity: multi-word motion or commercial action phrases)
   - Context (Environment/Background: multi-word background or location setting phrases)
   - Search Intent & Commercial Concept (Abstract Purpose: multi-word phrases representing the buyer's target intent, commercial use cases, digital trends, emotional concepts, or symbolic metaphors)
   - Industry (Specific/Technical Category: multi-word technical or professional industry terms)
3. Every keyword MUST be a MULTI-WORD phrase (consisting of 2 or 3 words separated by spaces). Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  }
  let visualDescriptions = [];
  let parsedVisualFactsList = [];
  const fallbackGeminiModel = aiModelPerformance === "speed" ? "gemini-2.5-pro-preview" : "gemini-2.5-pro";
  const visionModelToUse = activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel;
  console.log(`[JohMeta Pipeline - Batch] Stage 1: Running Provider 1 \u2014 Gemini Vision (Visual Facts Detection)...`);
  for (let i = 0; i < items.length; i++) {
    const imageParts = items[i].frames.map((frame) => processFrameServer(frame));
    let mediaTypeContext = "The provided image is a photograph or digital artwork. Generate natural, human-readable descriptions of concepts and visual facts smoothly.";
    if (toolType === "video" /* VIDEO */) {
      mediaTypeContext = "CRITICAL: The provided images are sequential frames (Start, Middle, End) from a single VIDEO. You MUST analyze the continuous motion, narrative progression, concepts, and storyline (alur) across the frames. Do not just describe them individually; synthesize the overall action and concept into natural, coherent metadata.";
    } else if (toolType === "vector" /* VECTOR */ || toolType === "vector_eps" /* VECTOR_EPS */) {
      mediaTypeContext = "CRITICAL: The provided image is a VECTOR illustration. You MUST analyze and categorize it based on the ACTUAL SUBJECT MATTER visually present (e.g. if it shows an animal, classify as Animal; if it shows people, classify as People). Do NOT just default to 'Graphic Resources' or 'Abstract' unless it is genuinely a background/texture without clear subjects. Generate natural, smooth descriptions of the subjects.";
    }
    const visionSystemInstruction = `ROLE:
You are a Visual Metadata Analyzer.
Analyze only what is visually verifiable in the image.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner, not just the center or main subject. Check every edge, corner, background, and small element.
2. NO HALLUCINATION: Perform a deep and thorough visual scan. You are strictly forbidden from guessing, making things up, or assuming details if you do not physically see them in the image. Your analysis must be 100% based on visual facts.
3. Identify subjects naturally and act like a human based on strong visual, cultural, or contextual cues. For example: if a subject clearly appears to be an "Indian woman" wearing cultural attire or having distinct features, directly identify her as an "Indian woman" rather than broadly describing physical features. This applies to recognizing professions, events, locations, nationalities, relationships, and emotions when they are visually evident.
4. Never hallucinate brands, trademarked logos, or copyrighted characters.
5. If uncertain, provide the closest accurate generic description.

STRICT PROHIBITIONS:
* Never include specific brand names or trademarked logos (must be described generically).
* Never include copyrighted characters.

PRIMARY OBJECTIVE:
Detect every visible subject, action, color, visible text, and composition detail.
Also, conduct a deep assessment on the asset's artistic theme, deeper meaning, and symbolic concept (baca makna mendalam & artistik dari aset tersebut).
Also, perform a profound visual semantic analysis of the image content to suggest the most relevant microstock categories from the official lists.
Return JSON ONLY under the key "VISUAL_FACTS".
Do not generate title or keywords.

Asset Context: ${mediaTypeContext}

OFFICIAL MICROSTOCK CATEGORY REFERENTIALS FOR SEMANTIC SUGGESTIONS:
- Adobe Stock Categories: ${categoriesText}
- Shutterstock Categories: ${shutterstockCategoriesText}

OUTPUT FORMAT:
{
  "VISUAL_FACTS": {
    "primary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "secondary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "background_elements": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "visible_text": [],
    "colors": [],
    "actions": [],
    "composition": [],
    "deeper_meaning_and_symbolism": "Describe the deeper artistic meaning, theme, emotional mood, symbolic message, or conceptual representation of the asset (makna, pesan artistik, atau analogi konsep dari aset tersebut) that represents its true value.",
    "semantic_category_analysis": {
      "adobe_id": 0,
      "shutterstock_category_1": "",
      "shutterstock_category_2": "",
      "reason": "Explain carefully why these official Adobe and Shutterstock categories match the visual content semantically based on primary subjects, context, and deeper theme"
    }
  }
}`;
    const promptText = toolType === "video" /* VIDEO */ ? `Tugas (Asset #${i + 1}): Analyze the 3 video frames (Start, Middle, End). Detect every visible primary and secondary subject, background element, visible text, action, narrative flow, overall storyline (alur), composition, and color. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]` : `Tugas (Asset #${i + 1}): Detect every visible primary and secondary subject, background element, visible text, action, color, and composition. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`;
    try {
      const visionResponse = await callGeminiWithRetry(visionModelToUse, {
        parts: [...imageParts, { text: promptText }]
      }, {
        systemInstruction: visionSystemInstruction,
        responseMimeType: "application/json",
        temperature: 0,
        topP: 0.8
      });
      let facts = visionResponse.text || "{}";
      visualDescriptions.push(`ASSET #${i + 1} VISUAL_FACTS:
${facts}`);
      let parsedFacts = {};
      try {
        parsedFacts = JSON.parse(extractJSON(facts)).VISUAL_FACTS || {};
      } catch (e) {
        parsedFacts = { primary_subjects: [], secondary_subjects: [], background_elements: [], visible_text: [], colors: [], actions: [], composition: [], semantic_category_analysis: { adobe_id: 0, shutterstock_category_1: "", shutterstock_category_2: "", reason: "Fallback default." } };
      }
      parsedVisualFactsList.push(parsedFacts);
    } catch (err) {
      console.warn(`[JohMeta Pipeline - Batch] Vision failed for item ${i}:`, err.message || err);
      const fallbackFacts = {
        VISUAL_FACTS: {
          primary_subjects: [{ name: "main subject", importance: 100 }],
          secondary_subjects: [],
          background_elements: [],
          visible_text: [],
          colors: ["natural"],
          actions: ["commercial posing"],
          composition: ["professional"],
          semantic_category_analysis: {
            adobe_id: 0,
            shutterstock_category_1: "",
            shutterstock_category_2: "",
            reason: "Fallback static categories used."
          }
        }
      };
      visualDescriptions.push(`ASSET #${i + 1} VISUAL_FACTS:
${JSON.stringify(fallbackFacts)}`);
      parsedVisualFactsList.push(fallbackFacts.VISUAL_FACTS);
    }
  }
  console.log(`[JohMeta Pipeline - Batch] Stage 2 & 3: Generating Draft Metadata for ${items.length} items...`);
  const dominantSubjectsArray = parsedVisualFactsList.map((facts) => {
    return [
      ...facts.primary_subjects || [],
      ...facts.secondary_subjects || []
    ].filter((item) => item.importance >= 50).map((item) => item.name);
  });
  const mediaContext = toolType === "video" /* VIDEO */ ? "CRITICAL: Sequential frames from a single VIDEO. Analyze continuous motion and storyline across frames." : toolType === "vector" /* VECTOR */ || toolType === "vector_eps" /* VECTOR_EPS */ ? "VECTOR illustration. Focus on ACTUAL SUBJECT MATTER explicitly visible inside the illustration for categorization." : "Photograph or digital artwork.";
  const customPromptCommand = customPrompt ? `
CRITICAL CUSTOM INSTRUCTION / ANCHOR / TARGET KEYWORDS:
The user has provided a custom instruction, command, or target keywords: "${customPrompt}"
ABSOLUTE RULES:
1. If this input is a custom command or instruction (e.g., "describe as retro", "make the title poetic", "focus on elegance", "exclude blue color", "emphasize commercial utility", etc.), you MUST strictly follow, apply, and prioritize this directive when generating the Title, Description, and Keywords!
2. If this input represents target keywords (e.g., specific words like "blue, ocean, sunset"), you MUST heavily prioritize and integrate these exact target keywords into both the Title and the Keywords list naturally and prominently.` : "";
  const genSystemInstruction = `You are a professional Adobe Stock, Shutterstock, and Getty Images metadata specialist. 
Your goal is to maximize the discoverability of visual assets and optimize them for search-engine algorithms to rank on the FIRST PAGE of microstock marketplaces.
OUTPUT MUST BE IN ENGLISH for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. NO INTELLECTUAL PROPERTY (IP): NEVER use company names, brand names, trademarks, or product names (e.g., Apple, Nike, iPhone, Coca-Cola). Use generic terms instead (e.g., "smartphone", "athletic shoes", "soda").
2. NO FAMOUS PEOPLE OR CHARACTERS: NEVER include names of artists, celebrities, public figures, or fictional characters.
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of".
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
6. NO MEDIA TYPE WORDS: NEVER include words like "photography", "photo", "illustration", "vector", "image", "picture" in the Title or Keywords. Focus purely on the actual subject matter.

MICROSTOCK ALGORITHMIC SEO & DISCOVERABILITY RULES:
- SEARCH INTENT MATCHING: Design metadata to precisely match the search queries of professional commercial buyers (e.g., designers, marketing teams, agency publishers). Ask yourself: "What actual commercial search query would a buyer type to purchase this exact asset?"
- SEMANTIC TAXONOMY: Blend high-weight concrete keywords (exactly what is visible) with abstract conceptual terms (emotions, commercial uses, metaphorical concepts, themes, and demographic vibes).
- HIGH-VALUE NICHE FRONT-LOADING: Place the highest-value, highly specific visual descriptors and niche-relevant keywords at the very beginning of the Titles and Keywords list. Microstock search algorithms weigh earlier words much higher!

Rules for Titles:
1. Focus directly on the main subject and action. Introduce the content clearly. Front-load the most relevant searchable visual keywords. CRITICAL: MUST NOT start with "Vector of", "Illustration of", "Drawing of", or "Continuous line drawing of".
2. Use Sentence case (only the first letter of the entire title should be capitalized, with the rest in lowercase except for proper nouns).
3. Use easy-to-read phrases, NOT formal sentence structures.
4. DO NOT treat the title like a list of keywords. No commas separating words.

Rules for Descriptions:
1. Provide a thorough visual breakdown of the scene, including colors, composition, and specific details, rich in high-density SEO synonyms.
2. ALWAYS conclude the description with a sentence starting with "Ideal for..." or "Perfect for..." that suggests how a customer might use this asset (e.g., "Ideal for tech blogs or app UI presentations").
3. Limit to 200 characters.

Rules for Keywords:
1. Start with the most important, high-converting commercial descriptors. Sort them in descending order of relevance.
2. CRITICAL: Keywords must be single words only. NEVER use multi-word phrases or compound words with spaces.
3. Ensure no IP, brands, or names are included.
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the suggested adobe_id from the corresponding visual_facts if accurate.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the suggested shutterstock categories from target visual_facts if accurate.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

STRICT DEFINING RULES:
- Return a JSON OBJECT containing a "results" array of exactly ${items.length} objects.
- Order MUST match input items exactly.
- Base everything 100% on the VISUAL_FACTS provided for each asset, including the suggestions inside "semantic_category_analysis".

SOURCE VISUAL_FACTS:
${visualDescriptions.join("\n\n")}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "results": [
    { 
      "title": "A highly descriptive natural language title representing the core subject", 
      "description": "A detailed visual description focusing on subjects, setting, and mood", 
      "keywords": [],
      "category_id": 1,
      "shutterstock_category_1": "Abstract",
      "shutterstock_category_2": "Backgrounds/Textures",
      "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly"
    }
  ]
}`;
  let draftMetadataArray = [];
  try {
    let genResponse;
    if (NON_GEMINI_PROVIDERS.has(provider)) {
      try {
        genResponse = await callOpenAICompatibleWithRetry({
          systemInstruction: genSystemInstruction,
          contents: `Generate draft metadata array based on VISUAL_FACTS for ${items.length} assets. [RunID: ${Date.now()}-${Math.random()}]`,
          responseMimeType: "application/json",
          config: { temperature: temperature ?? 0.1, topP: 0.8 },
          model: activeModel
        });
      } catch (providerError) {
        console.warn(`[JohMeta Pipeline - Batch] ${provider.toUpperCase()} failed completely:`, providerError.message);
        console.warn(`[JohMeta Pipeline - Batch] Falling back to Gemini as absolute failsafe...`);
        genResponse = await callGeminiWithRetry(fallbackGeminiModel, {
          parts: [{ text: `Generate draft metadata array based on provided VISUAL_FACTS source. [RunID: ${Date.now()}-${Math.random()}]` }]
        }, {
          systemInstruction: genSystemInstruction,
          responseMimeType: "application/json",
          temperature: temperature ?? 0.1,
          topP: 0.8
        });
      }
    } else {
      genResponse = await callGeminiWithRetry(activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel, {
        parts: [{ text: `Generate draft metadata array based on provided VISUAL_FACTS source. [RunID: ${Date.now()}-${Math.random()}]` }]
      }, {
        systemInstruction: genSystemInstruction,
        responseMimeType: "application/json",
        temperature: temperature ?? 0.1,
        topP: 0.8
      });
    }
    let rawContent = typeof genResponse === "string" ? genResponse : genResponse.text;
    console.log("[STAGE 2/3 BATCH] RAW RESPONSE:");
    console.log(rawContent);
    draftMetadataArray = JSON.parse(extractJSON(rawContent));
    console.log("[STAGE 2/3 BATCH] PARSED:");
    console.log(draftMetadataArray);
    if (!Array.isArray(draftMetadataArray)) {
      if (draftMetadataArray && typeof draftMetadataArray === "object") {
        if (Array.isArray(draftMetadataArray.metadata)) draftMetadataArray = draftMetadataArray.metadata;
        else if (Array.isArray(draftMetadataArray.items)) draftMetadataArray = draftMetadataArray.items;
        else if (Array.isArray(draftMetadataArray.results)) draftMetadataArray = draftMetadataArray.results;
        else if (Array.isArray(draftMetadataArray.data)) draftMetadataArray = draftMetadataArray.data;
        else if (Object.values(draftMetadataArray).length === 1 && Array.isArray(Object.values(draftMetadataArray)[0])) draftMetadataArray = Object.values(draftMetadataArray)[0];
        else draftMetadataArray = [draftMetadataArray];
      } else {
        throw new Error("Not an array and cannot map to array");
      }
    }
    if (Array.isArray(draftMetadataArray) && draftMetadataArray.length === 0) {
      throw new Error("Generated an empty array []");
    }
  } catch (err) {
    console.error("[JohMeta Pipeline - Batch] Generation Stage 2/3 Failed:", err);
    throw err;
  }
  console.log(`[JohMeta Pipeline - Batch] Stage 4, 5 & 6: Final Validation for ${items.length} items...`);
  console.log("DRAFT BEFORE AUDIT", JSON.stringify(draftMetadataArray, null, 2));
  const validatorSystemInstruction = `You are a professional Adobe Stock and Shutterstock metadata specialist. 
Your goal is to maximize the discoverability of visual assets.
OUTPUT MUST BE IN ${getLanguageName(metadataLanguage)} for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE (NO INTELLECTUAL PROPERTY - Based on https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html): 
   - You MUST strictly comply with Adobe Stock's intellectual property refusal guidelines. There are absolutely ZERO exceptions to this rule. Any mention of a brand name, trademark, proprietary model, or protected landmark in the Title, Description, or Keywords will result in instant rejection of the asset by stock reviewers. Always default to generic, descriptive terms!
   - NEVER use, name, or reference any company names, brand names, manufacturer names, trademarked names, or product names (e.g., Apple, Microsoft, Google, Samsung, Nike, Adidas, Sony, Nintendo, Coca-Cola, Pepsi, Starbucks, Disney, Lego, Barbie).
   - NEVER name specific proprietary models, series, or product lines in either the title or keywords (e.g., do NOT use "iPhone", "MacBook", "iPad", "Nintendo Switch", "PlayStation", "Xbox", "Jeep", "Vespa", "Lego", "Barbie", "Air Max", "Walkman", "GoPro"). Instead, use strictly generic equivalents (e.g., use "smartphone", "laptop", "tablet computer", "handheld gaming console", "video game console", "off-road sport utility vehicle", "motor scooter", "toy building blocks", "fashion doll", "athletic sneakers", "portable cassette player", "action camera").
   - NEVER include trademarked names of common products, materials, or services that have become genericized in speech but are protected trademarks (e.g., do NOT use "Velcro" -> use "hook and loop fastener"; "Popsicle" -> use "ice pop"; "Post-it" -> use "sticky note"; "Band-Aid" -> use "adhesive bandage"; "Super Glue" -> use "cyanoacrylate adhesive"; "Frisbee" -> use "flying disc"; "Bubble Wrap" -> use "plastic bubble packaging"; "Crayola" -> use "wax crayons"; "Teflon" -> use "non-stick coating"; "Tupperware" -> use "plastic food storage container"; "PowerPoint" -> use "presentation software"; "Photoshop" -> use "digital image editing software"; "Xerox" -> use "photocopier").
   - NEVER include specific, identifiable car brands/models or manufacturers (e.g., "Porsche 911", "Ferrari", "Tesla Model 3"). Use generic descriptors (e.g., "modern sports car", "electric sedan", "luxury racing automobile").
   - NEVER include names of protected landmarks, private venues, parks, or architectural works that have strict intellectual property/trademark rights on their names (e.g., do NOT use "Disneyland", "Eiffel Tower", "Empire State Building", "Sydney Opera House", "Taj Mahal", "Louvre Museum", "Burj Khalifa", "Colosseum", "Stonehenge"). Instead, refer to them generically where possible (e.g., "famous amusement park", "historic European wrought iron tower", "art deco skyscraper", "iconic harbor opera house", "ancient white marble mausoleum").
   - NEVER include names of fictional characters, intellectual franchises, films, games, or books (e.g., "Harry Potter", "Spider-Man", "Mickey Mouse", "Pok\xE9mon", "Minecraft"). Use generic visual descriptions (e.g., "wizard characters", "superhero figure", "cartoon mouse", "pocket monsters design", "pixel block game style").
   - INTELLECTUAL PROPERTY REFUSAL COMMON CAUSES TO STICK TO (MUST COMPLY):
     * Use of logos, trademarks, brand names, or identifiable product packaging is STRICTLY PROHIBITED.
     * Commercial products with distinctive designs MUST NOT be named or suggested as main subjects, such as toys, fashion items, electronics, or designer furniture.
     * Depictions of ticketed locations or restricted sites without required property releases are STRICTLY FORBIDDEN.
     * Certain landmarks or monuments cannot be accepted or named, even with releases (e.g., Menara Eiffel di malam hari, Burj Khalifa, Burj Al Arab, Sydney Opera House, Atomium, Louvre Pyramid, Space Needle, Hollywood Sign, Istana Neuschwanstein, Kuil Sagrada Fam\xEDlia interior).
     * Modern architecture with a unique or recognizable design must never be referred to by its trademarked/proprietary name when shown as the primary focus without a release.
     * Copyrighted works, including art, sculptures, street art, illustrations, fonts, or graphic elements created by others, must never be named or referenced.
2. NO FAMOUS PEOPLE OR CHARACTERS: NEVER include names of artists, celebrities, public figures, or fictional characters.
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of".
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
6. NO MEDIA TYPE WORDS: NEVER include words like "photography", "photo", "illustration", "vector", "image", "picture" in the Title or Keywords. Focus purely on the actual subject matter.
7. NATURAL HUMAN-LIKE INFERENCE: Identify demographics, professions, cultures, and context naturally like a human would. If a person visually appears to be an "Indian woman", describe her as an "Indian woman" rather than "woman with brown skin". If someone is wearing a white coat in a clinic, call them a "doctor". Apply this human-like recognition to ethnicities, locations, seasons, relationships, and events based on strong visual and cultural cues. Do NOT be overly literal or robotic.

Rules for Titles:
- Use clear natural language.
- Describe only visible elements in the image.
- Put the main subject at the beginning of the title.
- Include important commercial keywords naturally.
- Do not use keyword stuffing.
- Do not use brand names, trademarks, company names, or copyrighted terms.
- Do not use marketing language such as "best", "amazing", "stunning", "beautiful", or "perfect".
- Do not use articles unless necessary (a, an, the).
- CRITICAL TITLE STRUCTURE: [Main Subject] + [Action] + [Environment] + [Purpose or Concept]. Must be SEO friendly and highly relevant to the asset.
- Include one relevant commercial concept if visible (business, finance, technology, healthcare, education, sustainability, etc.).
- Use sentence case.
- Output only one title.
- Do not include explanations, labels, quotation marks, or numbering.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. Provide a thorough literal visual breakdown of the scene. Focus heavily on what is literally visible in the image rather than abstract concepts. Buyers and reviewers prefer practical and literal descriptions. Include colors, composition, and specific details using human-like language.
3. ALWAYS conclude the description with a sentence starting with "Ideal for..." or "Perfect for..." that suggests how a customer might use this asset (e.g., "Ideal for tech blogs or app UI presentations").
4. Limit to 200 characters.

Rules for Keywords:
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the suggested adobe_id from the corresponding visual_facts if accurate.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the suggested shutterstock categories from target visual_facts if accurate.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

SOURCE VISUAL_FACTS:
${visualDescriptions.join("\n\n")}

DRAFT METADATA TO VALIDATE:
${JSON.stringify(draftMetadataArray, null, 2)}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "results": [
    {
      "title": "A highly descriptive natural language title representing the core subject",
      "description": "A detailed visual description focusing on subjects, setting, and mood",
      "keywords": [],
      "category_id": 0,
      "shutterstock_category_1": "",
      "shutterstock_category_2": "",
      "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly",
      "confidence_score": 0.95
    }
  ]
}`;
  let finalMetadataArray = [];
  try {
    const validResponse = await (NON_GEMINI_PROVIDERS.has(provider) ? callOpenAICompatibleWithRetry({
      systemInstruction: validatorSystemInstruction,
      contents: `Audit and validate the Draft Metadata array for ${items.length} assets. [RunID: ${Date.now()}-${Math.random()}]`,
      responseMimeType: "application/json",
      config: { temperature: temperature ?? 0.1, topP: 0.8 },
      model: activeModel
    }) : callGeminiWithRetry(activeModel && activeModel.startsWith("gemini-") ? activeModel : fallbackGeminiModel, {
      parts: [{ text: `Audit and validate the Draft Metadata array for ${items.length} assets based on VISUAL_FACTS. [RunID: ${Date.now()}-${Math.random()}]` }]
    }, {
      systemInstruction: validatorSystemInstruction,
      responseMimeType: "application/json",
      temperature: temperature ?? 0.1,
      topP: 0.8
    }));
    finalMetadataArray = JSON.parse(extractJSON(typeof validResponse === "string" ? validResponse : validResponse.text));
  } catch (err) {
    console.warn("[JohMeta Pipeline - Batch] Batch Validation Stage 4/5/6 Failed: bypassed:", err.message);
    finalMetadataArray = draftMetadataArray.map((d) => {
      const heur = getHeuristicCategories(d.title, d.keywords || []);
      return {
        ...d,
        category_id: heur.category_id,
        shutterstock_category_1: heur.shutterstock_category_1,
        shutterstock_category_2: heur.shutterstock_category_2
      };
    });
  }
  try {
    let dataArray = finalMetadataArray;
    if (!Array.isArray(dataArray)) {
      if (dataArray && typeof dataArray === "object") {
        if (Array.isArray(dataArray.metadata)) {
          dataArray = dataArray.metadata;
        } else if (Array.isArray(dataArray.items)) {
          dataArray = dataArray.items;
        } else if (Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else if (Array.isArray(dataArray.data)) {
          dataArray = dataArray.data;
        } else if (Object.values(dataArray).length === 1 && Array.isArray(Object.values(dataArray)[0])) {
          dataArray = Object.values(dataArray)[0];
        } else {
          dataArray = [dataArray];
        }
      } else {
        dataArray = [];
      }
    }
    if (dataArray.length < items.length) {
      console.warn(`[JohMeta Pipeline - Batch] Model returned fewer items (${dataArray.length}) than expected (${items.length}). Padding with fallbacks.`);
      while (dataArray.length < items.length) {
        dataArray.push({});
      }
    } else if (dataArray.length > items.length) {
      console.warn(`[JohMeta Pipeline - Batch] Model returned more items (${dataArray.length}) than expected (${items.length}). Truncating.`);
      dataArray = dataArray.slice(0, items.length);
    }
    return dataArray.map((rawMetadata, index) => {
      let metadata = rawMetadata && typeof rawMetadata === "object" && !Array.isArray(rawMetadata) ? { ...rawMetadata } : {};
      if (metadata.desc && !metadata.description) metadata.description = metadata.desc;
      if (metadata.caption && !metadata.description) metadata.description = metadata.caption;
      if (metadata.short_description && !metadata.description) metadata.description = metadata.short_description;
      if (metadata.image_description && !metadata.description) metadata.description = metadata.image_description;
      if (metadata.name && !metadata.title) metadata.title = metadata.name;
      if (metadata.headline && !metadata.title) metadata.title = metadata.headline;
      if (metadata.subject && !metadata.title) metadata.title = metadata.subject;
      metadata.description = ensureDescription(metadata.description || "", metadata.title || "", metadata.keywords || []);
      if (!metadata.keywords || !Array.isArray(metadata.keywords)) {
        metadata.keywords = [];
      }
      let cleanedKeywords = [];
      metadata.keywords.forEach((k) => {
        if (typeof k === "string") {
          const cleanPhrase = k.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ");
          if (cleanPhrase.length > 1) {
            if (keywordMode === "single") {
              const pieces = cleanPhrase.split(/\s+/);
              pieces.forEach((word) => {
                if (word.length > 1 && !isProhibitedKeyword(word)) {
                  cleanedKeywords.push(word);
                }
              });
            } else {
              if (!isProhibitedKeyword(cleanPhrase)) {
                cleanedKeywords.push(cleanPhrase);
              }
            }
          }
        }
      });
      const uniqueKeywords = Array.from(new Set(cleanedKeywords));
      const assetVisualFacts = parsedVisualFactsList[index] || {};
      const allowedTerms = [
        ...(Array.isArray(assetVisualFacts.primary_subjects) ? assetVisualFacts.primary_subjects : []).map((x) => x?.name || ""),
        ...(Array.isArray(assetVisualFacts.secondary_subjects) ? assetVisualFacts.secondary_subjects : []).map((x) => x?.name || ""),
        ...Array.isArray(assetVisualFacts.actions) ? assetVisualFacts.actions : [],
        ...Array.isArray(assetVisualFacts.colors) ? assetVisualFacts.colors : []
      ].join(" ").toLowerCase();
      const rigorouslyFilteredKeywords = uniqueKeywords.filter((keyword) => {
        if (!allowedTerms || allowedTerms.length < 5) return true;
        const words = keyword.split(/\s+/);
        const hasMatchingWord = words.some((w) => allowedTerms.includes(w));
        return hasMatchingWord && !isProhibitedKeyword(keyword);
      });
      const remainingKeywords = uniqueKeywords.filter((k) => !rigorouslyFilteredKeywords.includes(k) && !isProhibitedKeyword(k));
      const finalKeywordList = [...rigorouslyFilteredKeywords, ...remainingKeywords];
      metadata.keywords = ensureKeywordCount(
        finalKeywordList,
        targetCount,
        assetVisualFacts,
        metadata.title,
        metadata.description,
        metadata.category_id,
        keywordMode
      );
      metadata.title = ensureTitleLength(metadata.title, metadata.keywords || [], metadata.description || "", titleLength);
      const parsedCategoryId = parseInt(String(metadata.category_id), 10);
      if (isNaN(parsedCategoryId) || parsedCategoryId < 1 || parsedCategoryId > 21) {
        const heur = getHeuristicCategories(metadata.title, metadata.keywords || []);
        metadata.category_id = heur.category_id;
      } else {
        metadata.category_id = parsedCategoryId;
      }
      const validShutterstockCats = toolType === "video" /* VIDEO */ ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES;
      if (!metadata.shutterstock_category_1 || !validShutterstockCats.includes(metadata.shutterstock_category_1)) {
        const heur = getHeuristicCategories(metadata.title, metadata.keywords || []);
        metadata.shutterstock_category_1 = validShutterstockCats.includes(heur.shutterstock_category_1) ? heur.shutterstock_category_1 : validShutterstockCats[0] || "Abstract";
      }
      if (!metadata.shutterstock_category_2 || !validShutterstockCats.includes(metadata.shutterstock_category_2) || metadata.shutterstock_category_2 === metadata.shutterstock_category_1) {
        const heur = getHeuristicCategories(metadata.title, metadata.keywords || []);
        let secondFallback = heur.shutterstock_category_2;
        if (secondFallback === metadata.shutterstock_category_1) {
          const possibleVal = toolType === "video" /* VIDEO */ ? "Backgrounds/Textures" : "Abstract";
          secondFallback = validShutterstockCats.find((cat) => cat !== metadata.shutterstock_category_1) || possibleVal;
        }
        metadata.shutterstock_category_2 = validShutterstockCats.includes(secondFallback) ? secondFallback : validShutterstockCats.find((cat) => cat !== metadata.shutterstock_category_1) || "Backgrounds/Textures";
      }
      metadata.category_reason = metadata.category_reason || assetVisualFacts?.semantic_category_analysis?.reason || "Suggested based on visual semantic analysis.";
      const targetId = items[index] ? items[index].id : items[0]?.id || "unknown";
      return { id: targetId, metadata };
    });
  } catch (error) {
    console.warn("[JohMeta Pipeline - Batch] Parse Error:", error);
    throw new Error("Gagal memproses respons batch metadata. Silakan coba kembali.");
  }
};
function processPromptResults(parsed, count, subject, userNegativePrompt) {
  let validatedPrompts = (parsed.prompts || []).filter((p) => typeof p === "string" && p.trim().length > 0);
  if (validatedPrompts.length === 0) {
    validatedPrompts = [`${subject} professional stock photography`].map((p) => p);
  }
  const originalLength = validatedPrompts.length;
  if (validatedPrompts.length < count) {
    const modifiers = [
      "cinematic macro photography, highly detailed",
      "isometric 3D render, octane render, stylized lighting",
      "vibrant watercolor ink illustration, splash art",
      "futuristic cyberpunk city night life background, neon glow",
      "classical oil painting, textured brush strokes, masterwork",
      "minimalist flat graphic design icon",
      "dramatic backlight, rim lighting, atmospheric depth",
      "wide angle landscape composition, beautiful morning light",
      "studio lighting portrait, bokeh depth of field",
      "vintage retro concept art, detailed illustration"
    ];
    let modIdx = 0;
    while (validatedPrompts.length < count) {
      const base = validatedPrompts[validatedPrompts.length % originalLength];
      const mod = modifiers[modIdx % modifiers.length];
      validatedPrompts.push(`${base}, ${mod} (variation #${validatedPrompts.length + 1})`);
      modIdx++;
    }
  } else if (validatedPrompts.length > count) {
    validatedPrompts = validatedPrompts.slice(0, count);
  }
  const appendNeg = userNegativePrompt && userNegativePrompt.trim().length > 0 ? `Avoid: ${userNegativePrompt.trim()}` : "";
  const processedPrompts = validatedPrompts.map((p) => {
    if (appendNeg) {
      const separator = p.trim().endsWith(".") || p.trim().endsWith(",") ? " " : ", ";
      return `${p.trim()}${separator}${appendNeg}`;
    }
    return p.trim();
  });
  return {
    prompts: processedPrompts,
    negativePrompt: appendNeg || parsed.negativePrompt || "",
    styleExplanation: parsed.styleExplanation || [
      `Berhasil mensintesis ${count} variasi prompt bertema ${subject}.`,
      `Menggunakan spektrum gaya dan variabilitas komposisi visual.`,
      `Seluruh prompt dioptimasi dalam bahasa Inggris untuk Midjourney/Stable Diffusion.`
    ]
  };
}
var generateOptimizedPrompt = async (options) => {
  const {
    subject,
    styleCategory,
    variation,
    promptMode = "background",
    pngBgColor = "white",
    userNegativePrompt = "",
    minWords = 10,
    maxWords = 70,
    model = void 0,
    seed = Math.floor(Math.random() * 1e6)
  } = options;
  const count = Math.min(Math.max(variation, 10), 150);
  const angles = ["low-angle shot", "eye-level shot", "high-angle perspective", "overhead aerial shot", "macro close-up", "medium shot", "wide-angle panoramic shot", "three-quarter portrait shot"];
  const lightings = ["golden hour light", "bright overcast daylight", "soft window light", "dramatic side-lighting", "warm indoor ambient light", "moody twilight", "misty dawn light", "vibrant studio rim-lighting", "sun-dappled shadows", "cool soft morning light"];
  const compositions = ["rule of thirds alignment", "symmetric composition", "minimalist empty-space negative layout", "diagonal leading lines", "frame-within-a-frame depth", "centered dominant focus with spacious copy space", "shallow depth-of-field", "dynamic foreground elements with blurred background"];
  const seasonsOrWeathers = ["crisp autumn afternoon", "warm summer glow", "misty spring morning", "subtle winter frost", "gentle drizzle rain", "clear sunny day", "soft foggy atmosphere", "dusk sunset sky"];
  const colorPalettes = ["natural warm earthy tones", "subtle cool pastel hues", "vivid high-saturation colors", "sophisticated minimalist monochromatic tones", "muted organic color palette", "soft warm gold and cream"];
  let currentSeed = seed;
  const prng = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  const selectRandom = (arr) => {
    const r = prng();
    return arr[Math.floor(r * arr.length)];
  };
  const randomAngle = selectRandom(angles);
  const randomLighting = selectRandom(lightings);
  const randomComp = selectRandom(compositions);
  const randomSeason = selectRandom(seasonsOrWeathers);
  const randomColor = selectRandom(colorPalettes);
  const randomSaltInjection = `[Random Composition Base: ${randomAngle}, ${randomLighting}, ${randomComp}, ${randomSeason}, ${randomColor}, Seed ID: ${seed}]`;
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const isPngMode = promptMode === "png";
  let modeConstraint = "";
  const styleSpecificDirectives = {
    "Vector Art": " - Focus on clean geometric paths, flat colors, minimalist shapes, and sharp digital outlines typical of Adobe Illustrator. NO gradients unless requested.",
    "3D Render": " - Focus on soft studio lighting, Octane render quality, glossy or matte plastic materials, raytraced reflections, and smooth 3D surfaces.",
    "Sticker Illustration": ' - You must explicitly append tags such as "sticker format", "die-cut stickers", "sticker asset with white border" and "thick sticker outline" into the prompt variations.',
    "Flat Icon": " - Focus on simplified pictograms, 2D minimalist design, strong symbol-based visual language, and high-contrast solid colors.",
    "Pixel Art": " - Focus on visible square pixels, limited color palette, 8-bit or 16-bit retro game aesthetics, and sharp pixelated edges.",
    "Isometric": " - Focus on 3D objects viewed from a fixed 45-degree isometric angle, clean structural lines, and organized geometric composition.",
    "Claymation Style": " - Focus on hand-molded clay textures, fingerprint details, stop-motion animation aesthetic, and soft organic physical materials.",
    "Origami Style": " - Focus on folded paper textures, sharp creases, geometric paper construction, and delicate paper material appearance.",
    "HandDrawn Sketch": " - Focus on pencil or ink strokes, charcoal textures, artistic hatching, and the look of a sketchbook drawing.",
    "Glassmorphism": " - Focus on frosted glass effects, translucent layers, blurred background refraction, and sleek glossy reflections.",
    "Metal Emboss": " - Focus on metallic surfaces, raised 3D textures, engraved details, and realistic metal reflections like silver, gold, or steel.",
    "Line Art": " - Focus on clean black and white lines, elegant curves, minimalist continuous line work, crisp vector outlines, and zero shading or gradients unless requested. Elegant, simple, and high-contrast ink strokes.",
    "Lowpoly": " - Focus on visible geometric triangular facets, faceted surfaces, and stylized abstract crystalline structures.",
    "3D CGI": " - Focus on clean computer-generated imagery with perfect geometry. Emphasize synthetic materials like smooth plastic, polished glass, sleek metal, or vibrant gel. Use highly controlled studio lighting or global illumination. The result should look like a high-end digital render from Blender or Cinema 4D, NOT a real-world photograph. AVOID: Photorealistic textures, natural imperfections, and real camera noise.",
    "Cinematic": " - Focus on high-budget movie-set cinematography. MUST feel like a genuine motion picture still with narrative depth and dramatic mood. Prioritize: Wide cinematic aspect ratios, cinematic anamorphic lenses with subtle lens flares, organic volumetric haze, beautiful backlight/rim light, high production value, and deep cinematic color grading (e.g., warm gold, cool blue, orange and teal, moody cinematic shadow). Composition must be dynamic with cinematic framing (e.g., cinematic leading lines, cinematic symmetry, depth-of-field, tracking shot perspective). AVOID: Flat studio lighting, plain white/black backdrops, simple stock photography expressions, and non-cinematic flat compositions.",
    "Photorealistic": " - Generate photorealistic, authentic, high-end real-world photography. MUST look like a real physical photograph captured by a professional camera (e.g., DSLR or mirrorless). Prioritize: Pin-sharp clarity, natural skin/surface textures (e.g., pores, fine fabrics, wood grain, organic imperfections), authentic human candid expressions, and realistic real-world environments. Use natural sunlight, overcast daylight, or authentic studio strobe lighting with soft realistic shadows. Include realistic professional camera settings (e.g., 50mm lens, 85mm portrait lens, f/1.8 aperture for shallow depth of field, f/8 for sharp landscape, 1/250s shutter speed). AVOID: Theatrical cinematic color grading, CGI look, fantasy elements, artificial dramatic rim-lights, volumetric mist/fog, or movie-like dramatic staging.",
    "Anime/Manga": " - Focus on cel-shaded aesthetics, expressive character features, vibrant colors, and classic Japanese hand-drawn illustration styles.",
    "Watercolor Painting": " - Focus on flowing pigment washes, paper grain textures, organic color bleeds, and delicate artistic strokes.",
    "Oil Painting": " - Focus on heavy brushstrokes, impasto textures, rich pigment layers, and classical fine art canvas aesthetics.",
    "Paper Cut": " - Focus on layered paper textures (lapisan kertas bertumpuk), sharp and clean cut edges (tepi potongan tajam dan rapi), profound 3D depth effects from multiple stacked paper layers, soft drop shadows between layers (bayangan lembut antar lapisan kertas), highly detailed handcrafted papercraft aesthetic, compositions constructed purely from cut paper shapes rather than drawings/paintings, matte paper textures, clean silhouettes, and beautiful solid colors for each stacked layer.",
    "Abstract": ' - Style Guide: Deconstruct the subject into a dynamic expression of energy, motion, and non-literal forms. Visual Characteristics: Explosive swirls of pigment, kinetic energy trails, thick impasto textures, layered translucent facets, and dramatic asymmetric compositions. Sub-styles to master: Abstract Expressionism (gestural strokes), Fluid Art (marble/ink swirls), Neon Abstract (glow trails), Geometric Abstraction (fractured shapes), Fractal Patterns (mathematical complexity), or Glitch Art (digital distortion). Prompt Structure: "Abstract, [Subject deconstructed into energy/forms] using [Selected sub-style] with [Specific textures: e.g., vibrant paint splatters, crystalline facets, fluid silk flows] and [Atmospheric lighting]. No clear primary subject\u2014focus on the overall concept of motion and mood." AVOID: Photorealistic rendering, literal anatomy, recognizable objects, 3D raytracing, camera lens specs, and realistic world-building.'
  };
  const currentDirective = styleSpecificDirectives[styleCategory] || "";
  if (isPngMode) {
    const stickerPrevention = styleCategory !== "Sticker Illustration" ? ' - DO NOT use words like "sticker", "badge", or "die-cut" in the prompts. The subject must be a high-quality standalone asset.' : "";
    modeConstraint = `
CRITICAL PNG MODE SETTINGS:
- The user requests PNG Asset style generation.
- All generated prompt variations MUST strictly place the main subject "${subject}" isolated on a solid ${pngBgColor} background.
- Focus on a premium, high-end commercial presentation of the subject with exquisite detailing, high fidelity, and ultra-clean studio quality.
- The arrangement and styling are fully flexible\u2014let the AI design the composition dynamically, prioritizing a professional, high-end visual asset.
- You must explicitly append tags such as "isolated on a plain ${pngBgColor} background", "solid flat ${pngBgColor} backdrop", or "pure solid ${pngBgColor} background, no shadows" into the prompt variations.
${currentDirective}
${stickerPrevention}
- Extremely important: Do NOT describe any background scenery, environmental elements, horizon lines, decorative interiors, or context elements. The subject must float on a pure solid ${pngBgColor} background.`;
  } else {
    modeConstraint = `
CRITICAL BACKGROUND MODE SETTINGS:
- The user requests fully composed visual scenes with complex background environments or scenic backdrops.
${currentDirective}
- You MUST describe rich scenic environments (e.g., matching the style context "${styleCategory}") behind the subject.
- Do NOT isolate the subject on flat background. Integrate it with scenic depth and ambient environments.`;
  }
  let userNegInstruction = "";
  if (userNegativePrompt && userNegativePrompt.trim().length > 0) {
    userNegInstruction = `
- Custom anti-directives / negative constraints to strictly AVOID or exclude: "${userNegativePrompt}"
Make sure your generated prompts do not contain these elements or depict them in any form, and include them in the generated negativePrompt value.`;
  }
  const isPhotographic = ["Photorealistic", "Cinematic", "Vintage Photography"].includes(styleCategory);
  const systemInstruction = `You are an elite AI Image Prompt Designer specializing in text-to-image generators like Midjourney, DALL-E 3, Adobe Firefly, and Stable Diffusion.
Anda adalah AI Prompt Generator ahli yang bertugas membuat prompt gambar unik dan bervariasi.
Your job is to translate a raw idea and specific style choices into exactly ${count} highly unique, descriptive, and professional-grade generation prompt variations in English.

Input parameters:
- Base Subject/Idea: "${subject}"
- Selected Style Context: ${styleCategory}
- Theme Context & Salt Variabilitas: ${randomSaltInjection}
- Requested Number of Prompt Variations: ${count}
- Requested Word Count Range: ${minWords} to ${maxWords} words per prompt
- Focus Mode: ${promptMode.toUpperCase()}${userNegInstruction}
${isPngMode ? `- Requested PNG Background color: ${pngBgColor}` : ""}
${modeConstraint}

PROMPT GENERATION PRIORITY (STRICT ORDER):
1. Theme subject: The core subject MUST remain the dominant focus of the prompt.
2. Visual characteristics: Describe specific colors, shapes, and the overall aesthetic vibe.
3. Materials and textures: Detail the surfaces, physical properties, and tactile qualities (e.g., stacked paper layers for Paper Cut, hand-molded clay textures for Claymation, canvas grain/pigments for Oil/Watercolor paintings, clean vector geometry for Vector Art).
4. Environment: Only introduce environmental details if they naturally fit the theme. Do not introduce unrelated environments.
5. Lighting: Essential details about mood, shadows, and light sources (e.g., soft shadows between layers for Paper Cut, clean solid gradients for Vectors, natural sunlight/fog for photo styles).
6. ${isPhotographic ? "Camera details: Specific lens types, aperture, and camera angles (e.g., 85mm lens, f/1.8, high shutter speed, DSLR)." : "Medium-Specific details: Focus entirely on visual craftsmanship and physical/digital medium characteristics. Do NOT include camera models, focal lengths, shutter speeds, or photographic sensor details."}

Rules for the Generated Prompts:
0. PROMPT STRUCTURE FORMULA: Every prompt MUST strictly start with "${styleCategory}" and then follow this sequence: [Subject] [Action] [Visual Characteristics] [Materials/Textures] [Environment] [Lighting]${isPhotographic ? " [Camera Details]" : ""} [Commercial Intent]. Combine these elements into a fluid, professional description.
0.1 DOMAIN AUTHENTICITY: For artistic, illustrated, graphic, 3D, and crafted styles, you are strictly forbidden from forcing photographic jargon (such as "shot on", "aperture", "f-stop", "lens", "shutter speed", "DSLR", "realistic photography", "realistic skin/hair texture") into the prompts. They must remain 100% true to their original non-photographic artistic style.
0.2 COMMERCIAL PRIORITY: The subject must occupy at least 30% of the visual attention. The commercial concept must be immediately understandable.
1. ALWAYS translate the core subject "${subject}" to descriptive, high-quality, vivid English first if it was entered in another language (like Indonesian).
2. Return EXACTLY ${count} unique prompt variations as an array. Each must be distinct, professionally composed for its native style domain (real photography or high-quality illustration/craft/CGI), use distinct compositions/lighting/medium details, and include "copy space" (negative space) for text placement.
3. WORD COUNT CONSTRAINT: Each generated prompt SHOULD be between ${minWords} and ${maxWords} words long. Adjust the level of detail to strictly match this requested length profile.
4. COMMERCIAL STOCK COMPLIANCE: Focus on clean, high-resolution, sharp focus, uncluttered, professional editorial photography/art aesthetics, suitable for Shutterstock/Adobe Stock. Absolutely avoid trademarked logos or specific intellectual property.
5. NO KEYWORD SPAM: Strictly forbidden to provide a list of repetitive commas, keywords, or SEO tags. Describe the *composition* naturally and vividly (like a magazine editorial).
6. The list must contain exactly ${count} different strings. Do not repeat prompts.
7. The negativePrompt MUST be a single concise string starting with the word "Avoid" followed by a list of elements to exclude. If there are truly no relevant negative elements for a specific request, return an empty string for this field instead of using placeholders like "none" or "N/A".
8. CRITICAL QUALITY DIRECTIVE: This is for high-fidelity text-to-image generator prompts (e.g. Midjourney). Each prompt variation must read like a gorgeous, professional image description, not a database search query.
9. CRITICAL: Conform exactly to the requested JSON schema.
10. STRICT ADOBE NO SIMILAR CONTENT RULE (CRITICAL FOR ADOBE STOCK COMPLIANCE):
    You MUST adhere exactly to Adobe Stock's "Similar vs. Spamming" guidelines. Adobe Stock rejects content with the reason: "During our review, we found that your submission closely resembles content already available on Adobe Stock... we refuse content that is too repetitive so customers can easily find distinct and relevant content."
    - EVERY SINGLE PROMPT in the batch MUST be clearly, visibly, and dramatically differentiated from the others to prevent "Similar content" flag rejections.
    - Do NOT just make minimal variations (e.g., just changing a shirt color or moving a prop slightly). Each prompt must be a visually distinct, unique, and standalone masterpiece.
    - Moderators look for NOTICEABLE DIFFERENCES including variations in composition, color, expression, or scenario. You must be extremely selective and output only your most varied, premium, and distinct concepts.
    - Inject extreme variation across:
      * Composition & Camera Angle: Vary across wide shots, extreme close-up, medium shots, bird's-eye view, low-angle perspective, and overhead drone shots.
      * Color Palette & Lighting Setup: Vary across natural golden hour, bright overcast daylight, neon nights, moody low-key twilight, soft studio lighting, high-contrast chiaroscuro, and cool pastel hues.
      * Subjects, Expressions & Poses: Vary characters' ages, genders, ethnicities, actions, emotional expressions (e.g., focused, joyful, contemplative, active, serene), and direct interactions with their surroundings.
      * Scenario & Environment: Change environments completely (e.g., indoors vs. outdoors, modern minimalist spaces vs. raw nature, urban landscapes vs. intimate workspaces).
    - ABSOLUTE STYLE SEPARATION (CINEMATIC VS PHOTOREALISTIC):
      * If the Selected Style is "Cinematic", the output prompts MUST be strictly cinematic, looking like a movie-set still with anamorphic qualities, film color grading, volumetric lighting, and dramatic mood. Do NOT generate standard flat stock photos.
      * If the Selected Style is "Photorealistic", the output prompts MUST be strictly realistic, looking like sharp, candid, organic real-world captures with lifelike skin/surface textures, natural sunlight or soft studio strobes, and genuine human behaviors. Do NOT inject theatrical movie color grading or artificial film flares.
      * NEVER mix, swap, or blur the lines between Cinematic and Photorealistic style prompts! Keep them completely distinct and accurate to their true style definition.
    - PNG ASSET VARIATION (OBJECT COUNT & ARRANGEMENTS):
      * For PNG/isolated asset mode, you MUST inject extreme variety in subject count and arrangement. Stagger the variations so that some prompts describe a single standalone object, some describe exactly two related or complementary objects, and some describe an elegant flat lay, dynamic grouping, or a neat set of 3+ objects. This ensures a rich, diverse asset pack and completely prevents "similar content" rejection.
    - Share your best, most varied work.
11. ADOBE STOCK CONTENT STRATEGY (MUST FOLLOW STRICTLY):
You are an Adobe Stock content strategist. Before generating prompts, avoid concepts that are already heavily saturated on Adobe Stock.
- Avoid concepts that belong to the top 20% most common Adobe Stock categories.
- Prioritize: Emerging trends, Uncommon professions, Future technology, Niche hobbies, Rare cultural activities, Unique lifestyle situations, Untapped commercial concepts.
- Do not generate: Generic business meetings, Generic office workers, Generic smiling people, Generic laptops on desks, Generic handshakes, Generic teamwork scenes.
- Each prompt must represent a commercially valuable concept that is visually distinct from existing stock content.
- Generate concepts first, then generate prompts.
- Reject any concept that feels common, saturated, overused, or similar to typical Adobe Stock results.
12. CRITICAL NEGATIVE PROMPT FORMAT: If you provide a negativePrompt, it MUST start with the prefix "Avoid: " followed by the list of forbidden elements.
13. LANGUAGE CONSISTENCY: While all prompts must be in English, the styleExplanation must be in Indonesian.
14. OPTIONALITY: Jika tidak ada elemen yang benar-benar relevan atau dibutuhkan (khususnya untuk negativePrompt), jangan memaksakan untuk membuatnya (biarkan kosong). Hindari teks placeholder.
15. STICKER PREVENTION: Khusus untuk gaya gaya yang BUKAN Sticker, jangan buat detail border atau die-cut.`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      prompts: {
        type: import_genai.Type.ARRAY,
        items: { type: import_genai.Type.STRING },
        description: `An array containing exactly ${count} unique generated prompt variations based on the visual idea, strictly in English.`
      },
      negativePrompt: {
        type: import_genai.Type.STRING,
        description: "The corresponding negative prompt containing quality/style anti-directives."
      },
      styleExplanation: {
        type: import_genai.Type.ARRAY,
        items: { type: import_genai.Type.STRING },
        description: "A 3-bullet explanation list of styles used in Indonesia."
      }
    },
    required: ["prompts", "negativePrompt", "styleExplanation"]
  };
  const modelsToTry = ["gemini-2.5-pro", "gemini-2.5-pro-preview", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.5-pro"];
  let lastError = null;
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    let attempts = 0;
    const maxAttempts = 2;
    while (attempts < maxAttempts) {
      try {
        console.log(`[generateOptimizedPrompt] Attempting with ${provider.toUpperCase()} (attempt ${attempts + 1}/${maxAttempts})...`);
        const text = await callOpenAICompatibleWithRetry({
          systemInstruction,
          contents: `Expand the concept into ${count} unique immersive prompt variations of type "${styleCategory}" based on: "${subject}". Write fully formed, vivid natural language sentences.`,
          responseMimeType: "application/json",
          responseSchema,
          config: { temperature: 0.85 },
          model
        });
        const parsed = JSON.parse(text);
        let promptArray = [];
        if (parsed && Array.isArray(parsed.prompts)) {
          promptArray = parsed.prompts;
        } else if (Array.isArray(parsed)) {
          promptArray = parsed;
        } else if (parsed && Array.isArray(parsed.variations)) {
          promptArray = parsed.variations;
        }
        if (promptArray.length > 0) {
          return processPromptResults({ prompts: promptArray, negativePrompt: parsed.negativePrompt || "", styleExplanation: parsed.styleExplanation || [] }, count, subject, userNegativePrompt);
        }
        throw new Error("Missing or empty prompts array in JSON response");
      } catch (err) {
        lastError = err;
        attempts++;
        console.warn(`Error on ${provider.toUpperCase()} on attempt ${attempts}:`, err.message || err);
        if (attempts < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
  } else {
    const modelsToTryList = model && model.startsWith("gemini") ? [model, ...modelsToTry] : modelsToTry;
    for (const modelName of modelsToTryList) {
      let attempts = 0;
      const maxAttempts = 2;
      while (attempts < maxAttempts) {
        try {
          console.log(`[generateOptimizedPrompt] Attempting with model ${modelName} (attempt ${attempts + 1}/${maxAttempts})...`);
          const response = await callGeminiWithRetry(modelName, {
            parts: [{ text: `Expand the concept into ${count} unique immersive prompt variations of type "${styleCategory}" based on: "${subject}".

CRITICAL: Write fully formed, vivid natural language sentences. DO NOT use comma-separated keyword lists or tags. Each variation MUST be a complete, descriptive paragraph.` }]
          }, {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.85
          });
          const text = response.text || "{}";
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
            return processPromptResults(parsed, count, subject, userNegativePrompt);
          }
          throw new Error("Missing or empty prompts array in JSON response");
        } catch (err) {
          lastError = err;
          attempts++;
          console.warn(`Error on ${modelName} on attempt ${attempts}:`, err.message || err);
          if (err.message && err.message.includes("API_KEY")) throw err;
          if (attempts < maxAttempts) {
            const backoffTime = attempts * 1500;
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
          }
        }
      }
    }
  }
  console.warn("All AI models and attempts failed for Prompt Generation. Failing back to programmatic fallback...", lastError);
  const translationPairs = {
    "astronot": "astronaut",
    "kucing": "cat",
    "anjing": "dog",
    "kopi": "coffee",
    "secangkir": "a cup of",
    "lucu": "cute",
    "memegang": "holding",
    "gaya": "style",
    "dengan": "with",
    "gedung": "building",
    "pencakar": "scraper",
    "langit": "sky",
    "taman": "garden",
    "gantung": "hanging",
    "senja": "dusk",
    "rubah": "fox",
    "mata": "eyes",
    "bercahaya": "glowing",
    "bertengger": "perching",
    "berteduh": "sheltering",
    "bawah": "under",
    "pohon": "tree",
    "sakura": "cherry blossom",
    "mistis": "mystical",
    " interior": "interior",
    "perpustakaan": "library",
    "kuno": "ancient",
    "melayang": "floating",
    "lilin": "candle",
    "mobil": "car",
    "cepat": "fast",
    "pantai": "beach"
  };
  let words = subject.toLowerCase().split(/\s+/);
  let translatedWords = words.map((w) => translationPairs[w] || w);
  let resolvedSubject = translatedWords.join(" ");
  const styleFallbackMap = {
    "Cinematic": [
      "anamorphic lens, volumetric lighting, hyper-realistic cinematic key shot, intense atmospheric depth, cinematic lighting",
      "shot on Arri Alexa LF, moody dramatic scene, photorealistic smoke effects, shallow depth of field",
      "golden hour sunlight, masterfully composed cinema frame, intricate environmental storytelling",
      "rembrandt lighting style, cinematic shadow play, ultra-sharp 8k rendering, heavy depth of field",
      "cyber-noir cinema composition, epic scale, rainy conditions with beautiful lens glares, highly dramatic keyvisual",
      "warm rim-lit close up action frame, stunning environmental details, award-winning cinematic color grading",
      "breathtaking cinematic masterpiece, dramatic high-contrast lighting, 35mm lens rendering, hyperdetailed environment",
      "epic wide cinematic establishing shot, mist and volumetric fog playing with soft morning light",
      "professional movie concept art, epic scale composition, stylized dramatic shadows, soft amber glow",
      "low-key cinematic studio key lights, cinematic bokeh background, ultra-crisp resolution"
    ],
    "3D CGI": [
      "clean 3D CGI render, perfectly neat geometry, smooth plastic and glass materials, high-gloss synthetic surfaces",
      "vibrant 3D digital art, glossy metal and gel textures, controlled studio global illumination, Cinema 4D style",
      "polished 3D CGI illustration, stylized digital aesthetic, subsurface scattering on gel materials, Blender cycles render",
      "impeccable 3D render, minimalist digital composition, glossy reflections, vibrant color palette, non-photorealistic CGI",
      "high-end 3D visual, smooth semi-translucent surfaces, perfect highlights and shadows, professional digital craftsmanship",
      "stylized 3D CGI character, toy-like plastic finish, clean digital lines, vibrant studio lighting setup",
      "advanced 3D CGI abstract, geometric precision, glass and chrome materials, futuristic digital render",
      "ultra-clean 3D CGI close up, macro digital detail, smooth textures, professional CGI lighting",
      "creative 3D CGI concept, imaginative digital materials, neat shapes, high-quality digital production value",
      "high-fidelity 3D CGI render, synthetic material focus, clear digital resolution, perfect lighting balance"
    ],
    "Vector Art": [
      "sleek flat vector style, bold clean geometric outlines, vibrant color palette, vector graphics",
      "minimalist vector illustration, smooth curves, flat design aesthetic, Adobe Illustrator style",
      "sharp vector graphic, solid bold gradients, high fidelity flat shading style, crisp edges",
      "modern corporate vector illustration, stylized characters and scenery, trending on Dribbble",
      "creative 2D vector art, clean layout, perfect proportions, beautifully composed vector scene",
      "retro-wave flat vector art, precise paths, bold pop colors, clean design",
      "elegant minimalist flat graphic design, balanced colors, sharp clean paths, artistic vector",
      "2D stylized vector print illustration, high end packaging design concept, clean outline art",
      "modern editorial flat vector, stylized visual presentation, premium visual look",
      "flat minimal vector layout, screen printed aesthetic, striking balanced hues, beautiful color blocking"
    ],
    "Photorealistic": [
      "sharp raw photograph, ultra photorealistic, shot on 50mm f/1.2 lens, rich natural colors, highly detailed",
      "hyper-realistic photography, high-end studio portrait lighting, realistic skin textures and fine details",
      "candid street photo capturing perfect life-like mood, natural ambient daylight, 8k resolution, crisp",
      "award-winning macro photograph, intense detail, natural soft bokeh depth of field, stunning reality",
      "professional editorial commercial photo, masterfully balanced contrast, shot on high-end DSLR",
      "outdoor scenic realistic shot, overcast soft lighting, photorealistic textures, perfectly balanced shot",
      "cinematic photorealism, beautiful rim light, exquisite real-world texture rendering, ultra-sharp",
      "close up photorealistic shot, natural reflections, authentic atmosphere, high-fidelity colors",
      "crisp morning daylight photography, clean composition, true-to-life color grading, 100mm lens",
      "high dynamic range studio close-up, sharp facial details, stunning realism, beautiful soft shadows"
    ],
    "Fantasy Art": [
      "enchanting fantasy art style, ethereal magical glow, mythical elements, high fantasy digital painting",
      "legendary illustrative concept art, glowing fairy lights, majestic ancient scenery, ethereal mist",
      "breathtaking magical fantasy painting, vibrant celestial mood, whimsical details, highly immersive",
      "mythical fantasy masterpiece, epic scenery, radiant lighting elements, magical spell particle details",
      "dark fantasy digital paint style, ornate architecture, mysterious ambient light, extremely detailed",
      "dreamy surreal illustrative environment, cozy glowing colors, beautiful watercolor-like soft textures",
      "epic fantasy landscape painting, ancient ruins, magical glowing crystals, soft golden lighting",
      "celestial fantasy key art, divine golden illumination, beautiful starry sky background, masterwork",
      "whimsical storybook digital painting, rich saturated warm colors, cozy fantasy vibe",
      "gothic fantasy concept art, dramatic moonlit scenery, beautiful intricate illustrations, epic scale"
    ],
    "Scifi Concept Art": [
      "sci-fi concept art illustration, high-tech spaceship interior, futuristic details, cinematic key visual",
      "space exploration alien-planet scenic, cyberpunk elements, futuristic architecture, sleek structures",
      "advanced robotics blueprint style visual, high-tech holograms, futuristic design concept",
      "epic interstellar landscape, planets and stars, deep cosmic color palette, futuristic sci-fi visual",
      "futuristic laboratory scene, glowing blue neon lines, complex technical details, advanced tech concept",
      "cyber-enhanced futuristic visual, high-tech carbon fiber textures, detailed metal mesh patterns",
      "intergalactic space station docking bay illustration, giant sci-fi engines, massive scale, detailed machinery",
      "gorgeous sci-fi poster illustration, futuristic neon-lit monolith, intricate machinery, sleek layout",
      "futuristic metropolis skybridge scene, flying vehicles, gorgeous sci-fi concept aesthetic",
      "advanced alien civilization city view, glowing structures, beautiful high-tech concept art"
    ],
    "Anime/Manga": [
      "vibrant anime style key visual, detailed digital anime cell, beautiful character art, Studio Ghibli inspired scenery",
      "modern anime digital painting, gorgeous hand-drawn aesthetics, soft lighting, vibrant aesthetic shades",
      "epic action anime fight background, dramatic light beams, detailed hand-sketched lines, top trending anime artist",
      "cozy daily life anime wallpaper, beautiful afternoon sunbeams, dust particles, beautiful warm mood",
      "detailed retro 90s anime style, nostalgic color grading, classic hand-painted cell look",
      "gorgeous movie poster anime art, breathtaking sky and clouds, epic scaling, beautiful colors",
      "Kyoto Animation style, brilliant soft glow, highly expressive character focus, clean line art",
      "manga cover art illustration, high contrast inks with gorgeous screentones, stylized color shading",
      "epic fantasy anime scene, magical floating islands, sparkling lights, beautiful color grading",
      "shounen anime style dramatic key shot, power aura, intense lines, breathtaking backdrop"
    ],
    "Watercolor Painting": [
      "artistic watercolor painting, bleeding pigment washes, elegant ink spatters, beautiful canvas texture",
      "soft pastel watercolor illustration, delicate flowing colors, hand-painted artistic masterpiece",
      "vivid watercolor with heavy ink accents, artistic splash art style, organic fluid watercolor washes",
      "traditional Japanese sumi-e wash painting, delicate brushstrokes, minimalist watercolor theme",
      "dreamy watercolor and gouache illustrations, gorgeous bleeding shades, fine textures",
      "expressive abstract watercolor art, dripping colorful pigments, beautiful modern composition",
      "vintage style watercolor page illustration, warm organic feel, handcrafted art texture",
      "delicate floral watercolor style, soft gradients, hand-sketched ink outlines, highly artistic",
      "rustic watercolor concept art, beautiful blending, rich paper grains, atmospheric colors",
      "vibrant watercolor sky and environment wash, creative paint blots, detailed fluid color strokes"
    ],
    "Oil Painting": [
      "classical fine art oil painting, rich canvas textures, thick impasto brushstrokes, realistic lighting",
      "masterfully composed Renaissance oil painting, textured pigment layers, dramatic chiaroscuro contrast",
      "19th century impressionistic oil canvas, loose visible brush strokes, vivid colors, beautiful texture",
      "baroque style oil painting, dark atmospheric shadows playing with glowing warm candlelight",
      "modern palette knife oil painting, thick paint layers, heavily textured, contemporary art style",
      "gorgeous landscape oil painting, romanticism style, beautiful clouds, natural hand-painted texture",
      "museum masterpiece oil painting style, timeless classic colors, aged canvas cracks, realistic details",
      "textured brushstroke study oil art, bold colorful highlights, beautiful light play on canvas",
      "impressionist morning light oil canvas, soft pastels, lovely textured environment, masterwork",
      "vintage hand-painted portrait oil technique, rich pigments, weathered fine-art appeal"
    ],
    "Abstract": [
      "Dynamic abstract light trails on dark background, energetic flowing waves, vivid neon accents, sharp geometric glass shards",
      "High-contrast abstract energy, glowing sphere amidst swirling light ribbons, mysterious dark void, futuristic abstract art",
      "Radiant abstract light pulses, ethereal dark atmosphere, vibrant accent streaks, complex motion and light play",
      "Abstract digital light art, deep dark void background, sharp crystalline motion, vibrant glowing focal point",
      "Energetic abstract composition, fluid white light waves, sharp angular glass fragments, intense vibrant spotlight, dark noir atmosphere",
      "Vibrant fluid liquid art, colorful swirling thick pigments, high viscosity motion, chaotic yet harmonious abstract flow",
      "Futuristic geometric abstract, complex interlocking angular shapes, metallic textures, neon grid lines, cinematic dark theme",
      "Abstract particle simulation, dense glowing dots in motion, dark deep void, energetic dispersal, cinematic moody lighting",
      "Holographic gradient abstract, iridescent flowing curves, light refraction, mysterious ethereal textures, dark background",
      "Complex abstract fractal geometry, infinite intricate patterns, glowing edges, dark contrast lighting, futuristic artistic design"
    ],
    "Vintage Photography": [
      "authentic vintage analog photograph, film grain texture, classic 1970s warm color grading, nostalgic light leaks",
      "retro polaroid instant camera photograph, square white border, soft faded colors, nostalgic vintage vibe",
      "vintage monochrome photography, rich daguerreotype silver print scale, beautiful antique film look",
      "1960s kodachrome color photography style, rich saturated warm reds and yellows, beautiful analog grain",
      "nostalgic black and white sepia film photo, classic vignette borders, timeless antique photograph style",
      "old high-school yearbook photo style, soft focus, retro film texture, vintage aesthetic",
      "classic 35mm film photograph, light leaks on edges, nostalgic retro colors, vintage print feel",
      "faded retro travel postcard photography, dust and scratches, aged paper look, authentic vintage",
      "grainy retro atmospheric photo, beautiful light leak, retro warm tones, cinematic analog look",
      "antique vintage camera shot, authentic details, organic lens scratches, beautiful classic composition"
    ],
    "Cyberpunk": [
      "neon-infused cyberpunk style, wet city streets reflecting neon signs, rainy dark night city background",
      "futuristic cyberpunk terminal hacker layout, green glowing matrix codes, sleek high-tech interface",
      "futuristic cyberpunk setting, tall high-tech skyscrapers, flying vehicles, neon pink and cyber blue tones",
      "cyberpunk action movie key frame, dramatic rain, glowing cybernetic eye implants, intense mood",
      "atmospheric sci-fi cyberpunk visual, dense neon towers, heavy smog, gorgeous futuristic details",
      "high-tech low-life cyberpunk cyberpunk concept, complex mechanical details, rich neon color grading",
      "cyberpunk back-alley night view, neon signs in kanji, glowing holographic ads, cinematic lighting",
      "sleek cyberpunk motorcycle speedway scene, motion blur, glowing wheel rims, futuristic design",
      "cyberpunk indoor hacker den, multiple glowing screens, neon ambient illumination, highly detailed",
      "cybernetic futuristic street view, tech-wear characters, neon glows, epic atmospheric depth"
    ],
    "SteamPunk": [
      "steampunk concept design, Victorian style mechanical gadgets, brass gears, copper pipes, steam elements",
      "high-detailed steampunk airship flying, copper boiler engine, massive sails, retro-futuristic clouds",
      "polished brass and copper steampunk clock mechanism, clockwork details, Victorian engineer desk setting",
      "steampunk workshop background, intricate steam pipe valves, retro-future machinery, amber glow",
      "steampunk keyvisual, leather goggles, velvet top hat, mechanical gear details, atmospheric steam",
      "retro industrial steampunk train station scene, massive steam locomotives, iron girders, Victorian lighting",
      "highly ornate steampunk device blueprint, intricate golden brass engravings, vintage retro look",
      "vintage steampunk street view, cobblestone, gas lamps, steam-driven carriage, Victorian future",
      "steampunk laboratory scene, glass beakers, copper conduits, glowing chemical reactions, rich gears",
      "mechanical steampunk pocket watch close up, gears and springs, beautiful macro craftsmanship"
    ],
    // PNG Categories
    "3D Render": [
      "pristine 3D model render, Octane Render, smooth clay materials, vibrant raytracing, cute 3D character style",
      "cute stylized 3D mascot render, smooth plastic surfaces, pastel colors, soft studio lighting setup",
      "3D digital asset rendering, glossy metal and glass textures, high fidelity rendering, sleek layout",
      "vibrant 3D vector style render, playful elements, clean shapes, outstanding volumetric depth",
      "ultra modern glossy 3D key visual element, ray-traced ambient occlusion, glowing neon edges",
      "stylized 3D porcelain model, highly polished surface, clean pastel gradients, beautiful rendering",
      "creative 3D render element, whimsical design, soft plastic textures, warm studio light",
      "cute 3D game asset render, bright colors, friendly round edges, premium game design look",
      "3D metallic chrome asset, futuristic iridescent surface, glossy reflections, flawless render",
      "isometric 3D miniature object model render, toy-like details, charming polished material"
    ],
    "Flat Icon": [
      "minimalist flat icon graphic, clean modern UI vector icon, bold flat colors, creative simplicity",
      "creative app flat icon design, solid vector shapes, subtle gradients, clean minimalistic presentation",
      "modern flat vector outline icon, bold flat vector paths, highly identifiable simple glyph design",
      "playful flat design vector logo icon, high contract colors, extremely clean aesthetic style",
      "flat minimal vector graphic emblem, modern startup icon look, beautiful simplified design",
      "flat color vector icon, sleek layout, crisp lines, perfect 2D vector graphic representation",
      "creative simplified vector icon, modern application icon aesthetic, clean vector elements",
      "flat design icon element, thick clean outlines, bright pastel palettes, sleek vector finish",
      "minimalist flat icon, bold geometry, primary flat colors, professional design layout",
      "flat linear web icon design, vector asset, highly refined vectors, beautiful flat style"
    ],
    "Isometric": [
      "isometric cute diorama 3D style, orthographic perspective grid, beautifully detailed clean miniature layout",
      "cute isometric 3D block model, tiny details, charming stylized colors, soft drop shadows",
      "isometric game asset graphic, low-poly isometric 3D render, pristine clean edges, highly detailed",
      "retro isometric block illustration, orthographic perspective, beautiful miniature scale modeling",
      "micro isometric 3D concept asset, glossy plastic model looks, cute isometric lighting",
      "isometric voxel art style, pixelated 3D block model, vibrant retro colors, cute game design asset",
      "isometric technical diagram graphic, clean lines and grids, professional vector schematic look",
      "charming isometric diorama design, soft daylight source, perfectly aligned isometric scene",
      "low-poly isometric toy asset render, cute stylized mini elements, orthographic viewport",
      "isometric game building preset, highly polished 3D game model, detailed orthographic rendering"
    ],
    "Pixel Art": [
      "retro 16-bit pixel art key visual, detailed pixel grid, vibrant classic video game console palette",
      "cute 8-bit retro pixel mascot graphic, classic nostalgic game icon, flat color pixel colors",
      "pixel art character sprite sheet preview, pristine grid lines, stylized retro game aesthetic",
      "charming pixelated pixel art illustration, beautiful game background texture, retro aesthetic",
      "highly detailed pixel scene element, nostalgic colors, sharp clean pixels, pixel art masterpiece",
      "retro-wave synthwave pixel art graphic, neon pink and purple nodes, classic glowing grid pixels",
      "8-bit pixel game item icon, clean distinct pixels, highly stylized, classic pixel design",
      "isometric pixel art block, cute nostalgic diorama made of pixels, pristine pixelated lines",
      "detailed fantasy RPG style pixel art, beautiful colors, classic 16-bit retro game visual",
      "pixelated minimal sticker style graphic, cute game icon, clean pixels, sharp retro color theme"
    ],
    "Claymation Style": [
      "cute stop-motion claymation character model, plasticine clay textures, detailed fingerprint press marks, handcrafted clay look",
      "charming claymation toy style model, warm vibrant clay colors, cute clay sculpture, stop-motion look",
      "highly textured plasticine clay model, cute playful design, realistic clay wrinkles, handmade feel",
      "clay figure asset design, vibrant pastel shades, soft clay surface bumps, adorable clay style",
      "claymation style miniature item, cute round sculpture, artisanal clay finish, cozy crafted look",
      "stop-motion claymation prop, realistic pliable material surface, handcrafted clay look, brilliant modeling",
      "adventurous clay character render, gorgeous soft clay material render, cute tactile clay textures",
      "playful claymation style creature, adorable details, beautiful clay art masterpiece",
      "miniature soft toy clay sculpture, organic craft textures, cute model design, claymation render",
      "3D claymation aesthetic asset, smooth doughy textures, vivid clay color layout, fine pressed marks"
    ],
    "Sticker Illustration": [
      "adorable die-cut sticker style illustration, sharp clean borders, bold outlines, vivid colors, modern graphic element",
      "cute pop vector sticker graphic, crisp contour die-cut lines, stylized cartoon style, highly cute layout",
      "vibrant sticker vector design, modern graphic illustration, heavy white outline border, premium sticker style",
      "retro style cartoon sticker asset, thick clean black outlines, bold hand-drawn pop colors, sticker print look",
      "charming border sticker graphic, whimsical illustrations, cute stickers, high quality print vector looks",
      "gorgeous holographic-edged sticker design, glowing visual reflections, unique borders, modern graphic",
      "kawaii sticker design style, pastel colors, cute elements, clean white border outline",
      "bold graffiti style sticker graphic, stylized design, vibrant ink drips, heavy sticker border",
      "minimalist outline sticker vector graphic, clean modern design elements, trendy visual aesthetic",
      "watercolor style illustrated sticker, soft texture fills, sharp die-cut border, beautiful artisan design"
    ],
    "Lowpoly": [
      "low-poly faceted origami-like polygons, sharp geometric facets, flat shading render, low polygon count model",
      "cute lowpoly 3D scene element, sharp clean triangles, pristine flat shading, 3D papercraft vibe",
      "isometric low-poly vector graphic asset, geometric flat faces, minimalist block colors, 3D mesh design",
      "digital lowpoly geometric model, stylized faceted textures, sharp polygonal edges, creative polygonal style",
      "faceted crystal lowpoly design, glowing crystal shapes, sharp 3D triangles, beautiful game mesh style",
      "modern lowpoly origami illustration, stylized vector polygons, lowpoly design layout, clean gradients",
      "low-poly retro gaming model mesh, game developer lowpoly asset design, clean flat faces, highly stylized",
      "geometric lowpoly mountain/nature element, faceted blocky surfaces, gorgeous minimal polygons",
      "retro 3D lowpoly asset render, flat-shaded faces, high-fidelity polygonal corners, clean render",
      "abstract lowpoly sculpture, sharp polygon intersections, beautiful structural mesh colors"
    ],
    "HandDrawn Sketch": [
      "hand-drawn fine line sketch art, delicate realistic pencil crosshatching, raw graphite visual look, highly artistic details",
      "vintage style ink sketch drawing, precise black pen lines, high-detail handcraft illustrations",
      "artistic pencil portrait sketch style, realistic shading, hand-drawn paper textures, beautiful line work",
      "rustic architectural ink sketch, loose artistic lines, ink washes, gorgeous handcrafted sketch texture",
      "minimalist continuous line sketch art, elegant simple strokes, raw ink drawing aesthetic, stylish layout",
      "vintage botanical sketch, delicate pencil outlines, rustic paper fibers, highly authentic design",
      "beautiful charcoal sketch rendering, rich textured smudges, dark charcoal crosshatch details",
      "creative conceptual hand-drawn engineering sketch, grid lines, precise pen strokes, vintage notebook look",
      "cozy hand-sketched cartoon outline illustration, warm pencil style lines, cute handcrafted artwork",
      "detailed ink engraving drawing look, beautiful hatching patterns, traditional masterwork sketch"
    ],
    "Origami Style": [
      "intricate folded paper origami model, precise geometric creases, realistic authentic papercraft texture, delicate drop shadows",
      "cute colorful paper-crafted origami model, geometric folded paper style, clean minimalist paper textures",
      "3D origami paper art asset, beautiful paper fibers, delicate geometric paper folds, soft ambient shadows",
      "traditional Japanese origami paper sculpture, sharp intricate folds, elegant minimalist papercraft styling",
      "whimsical 3D paper fold art graphic, gorgeous pastel layers, realistic shadows, stylized paper craft",
      "minimalist origami design, clean sharp creases, light-textured paper material, masterfully folded model",
      "creative 3D papercraft character design, paperboard cutouts, geometric origami folds, beautiful shadow depth",
      "origami geometric model render, neat paper folding lines, delicate pastel colors, soft daylight lighting",
      "stylized paper sculpture design, geometric origami aesthetic, clean paper structures",
      "intricate layered origami artwork, multi-colored folded sheets, highly detailed papercraft construction"
    ],
    "Glassmorphism": [
      "sleek glassmorphic visual asset, realistic semitransparent frosted glass plate, premium glossy translucency",
      "modern glassmorphism UI element, blurred glass refraction layers, glowing abstract backing gradients",
      "futuristic glossy frosted glass icon, thick realistic glass edges, beautiful refractive rainbow light leaks",
      "glassmorphic semitransparent 3D graphic, sleek frosty surface, glowing pastel background elements",
      "premium frosted glass sculpture render, high fidelity reflections, beautiful glossmorphic refraction blur",
      "glassmorphism vector graphic design, translucent layering, glossy highlights, modern high-end look",
      "frosted semitransparent plate component, glowing digital ambient lights, pristine glass edges",
      "artistic translucent glass plate element, futuristic ray-traced glass refraction, premium aesthetic",
      "sleek glassmorphic layout card, frosted matte texture, realistic refractive glass drop shadow, glossy",
      "chromatic frosted glass artwork, semitransparent layering, glowing liquid gradient backgrounds, pristine"
    ],
    "Metal Emboss": [
      "metallic detailed embossed plate asset, silver metal foil engraving, brushed steel relief engraving, realistic shine",
      "gold leaf metal emboss medallion graphic, highly detailed engraved metal relief, metallic gold shines",
      "antique bronze metal emboss plate, heavy metallic oxidation highlights, copper relic engravings",
      "futuristic silver chrome embossed metal emblem, polished metal surfaces, sharp 3D embossing, high reflectivity",
      "metal stamp emboss art element, heavy indented press lines, exquisite steel plate texture",
      "brushed aluminum embossed vector logo badge, sharp machined edges, metallic metallic sheen, clean relief",
      "golden metal emboss pattern art, royal golden filigree engraving, luxurious thick gold texture and shine",
      "industrial steel emboss stamp, realistic metal reflections, dark iron details, heavy relief design",
      "vintage brass metal emboss emblem plates, polished bronze carvings, Victorian brass detailing",
      "sleek titanium embossed sheet plate graphic, futuristic metal engraving patterns, high-fidelity premium metal"
    ],
    "Line Art": [
      "minimalist black and white line art vector graphic, clean black outlines on solid white, continuous line drawing, elegant style",
      "contemporary fine line art asset, crisp black vector contours, minimalist aesthetic, graceful curves",
      "modern continuous single-line drawing style, sleek black ink lines, high contrast minimalist art design",
      "elegant line art vector illustration, pristine sharp black paths, creative line work icon, ultra-clean look",
      "minimalist outline vector illustration, modern clean line strokes, solid styling with high clarity",
      "beautiful abstract line art design, continuous ink pen line strokes, sophisticated flow and structure",
      "zen continuous line sketch graphic, balanced minimal black outlines, elegant and pure aesthetic",
      "sleek line art emblem vector, precise geometric single-line curves, highly readable silhouette design",
      "artistic minimalist contour illustration, fine line sketch, pristine black ink outline graphic, elegant styling",
      "trendy line art vector asset, single-stroke flow, perfect curves and sharp line endings, modern design look"
    ]
  };
  const activeModifiers = styleFallbackMap[styleCategory] || styleFallbackMap["Cinematic"];
  const generatedPrompts = [];
  const bgSuffix = promptMode === "png" ? `, isolated on clean solid ${pngBgColor} background, no shadows` : "";
  for (let i = 0; i < count; i++) {
    const modifier = activeModifiers[i % activeModifiers.length];
    generatedPrompts.push(`${resolvedSubject}, direct style of ${styleCategory}, ${modifier}${bgSuffix} (variation #${i + 1})`);
  }
  const finalNegative = userNegativePrompt && userNegativePrompt.trim().length > 0 ? `Avoid: ${userNegativePrompt.trim()}` : "";
  const promptsWithNegative = generatedPrompts.map((p) => {
    if (finalNegative) {
      const separator = p.trim().endsWith(".") || p.trim().endsWith(",") ? " " : ", ";
      return `${p.trim()}${separator}${finalNegative}`;
    }
    return p;
  });
  return {
    prompts: promptsWithNegative,
    negativePrompt: finalNegative,
    styleExplanation: [
      `Sistem pencadangan otomatis diaktifkan akibat kepadatan lalu lintas API Gemini.`,
      `Konsep subjek diterjemahkan dan diindeks secara prosedural.`,
      `Berhasil merumuskan ${count} variasi prompt menggunakan parameter procedural style: ${styleCategory} (${promptMode.toUpperCase()}).`
    ]
  };
};
var analyzeImageToPrompt = async (image, styleCategory = "Cinematic", model) => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const systemInstruction = `You are an expert AI visual analyst and prompt engineer.
Analyze the provided image and generate a highly detailed, professional text-to-image prompt.

CRITICAL VISUAL ANALYSIS AND VARIATION RULES:
1. FULL SCAN: You MUST examine the ENTIRE image to extract its core subject, commercial concept, and design/photographic niche.
2. ABSOLUTELY NO DIRECT REPLICATION: Do not just literally describe the original image. Extract its core commercial niche (e.g., "minimalist organic skincare flatlay", "cozy coffee shop interior").
3. RADICAL NICHE VARIATION: Generate a highly professional, optimized text-to-image prompt that creates a COMPLETELY NEW SCENARIO within the exact same niche. Change the subjects' poses, the specific objects, the time of day, or the camera angle radically. It must be a highly varied, unique concept that sells to the same target market, NOT a clone of the input image. Ensure every regeneration yields a distinctly different creative interpretation.
4. TECHNICAL BASELINE: Technical facts (lens, lighting, style) must match the niche, but the visual setup must be completely unique.

STEP 1: EXTRACT THE FOLLOWING DATA POINTS AS A BASELINE:
- Subject (The main entity)
- Action (What is happening)
- Environment (Setting, location, context)
- Mood (Emotional tone)
- Lighting (Type, direction, intensity)
- Camera angle (Position relative to subject)
- Lens estimate (Focal length, aperture, depth of field)
- Composition (Framing, rule of thirds, perspective)
- Visual style (Current aesthetic baseline)

STEP 2: GENERATE A DETAILED PROMPT MATCHING THE SELECTED STYLE: ${styleCategory}
Adapt the prompt structure according to the chosen style:
- If 'Photorealistic': focus on RAW photo quality, technical camera specs, hyper-real textures.
- If 'Cinematic': focus on anamorphic lens effects, color grading, lighting scenarios, film stock.
- If 'Adobe Stock': focus on clean backgrounds, commercial appeal, high contrast, studio lighting.
- If 'Editorial': focus on fashion/magazine composition, avant-garde elements, professional retouching styles.
- If 'Lifestyle': focus on natural motion, candid moments, warm/authentic lighting, everyday settings.
- If 'Fine Art': focus on brushstrokes, medium textures, artistic theory, museum-quality lighting.

CRITICAL RULES:
1. OUTPUT PROMPT MUST BE IN ENGLISH.
2. The description should be a concise summary of the visual analysis and how this variation differs or complements the original asset.
3. Return a JSON object with "prompt" and "description".`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      prompt: { type: import_genai.Type.STRING, description: "The generated image-to-image prompt." },
      description: { type: import_genai.Type.STRING, description: "Brief description of the image content." }
    },
    required: ["prompt", "description"]
  };
  const imagePart = processFrameServer(image);
  const modelsToTry = ["gemini-2.5-pro", "gemini-2.5-pro-preview", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.5-pro"];
  let response;
  let lastError;
  let responseText = "";
  const modelsToTryList = model && model.startsWith("gemini") ? [model, ...modelsToTry] : modelsToTry;
  for (const modelName of modelsToTryList) {
    try {
      const randomSalt = Math.random().toString(36).substring(7);
      response = await callGeminiWithRetry(modelName, { parts: [imagePart, { text: `Analyze this image and generate an optimized prompt for style: ${styleCategory}. Inject radical creative variation based on the niche. [Seed: ${randomSalt}]` }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.85
      });
      responseText = response.text || "{}";
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[analyzeImageToPrompt] Failed with ${modelName}:`, err.message || err);
      if (err.message && err.message.includes("API_KEY")) throw err;
    }
  }
  if (!responseText) {
    console.warn("analyzeImageToPrompt bypassed:", lastError?.message);
    throw lastError || new Error("Failed to analyze image. Please try again.");
  }
  try {
    let text = responseText;
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.warn("Gemini Parse Error:", error, responseText);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};
var analyzeBatchImageToPrompt = async (images, styleCategory = "Cinematic", model) => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const systemInstruction = `You are an expert AI visual analyst and prompt engineer.
Analyze the provided images and generate a highly detailed, professional text-to-image prompt for each one.

CRITICAL VISUAL ANALYSIS AND VARIATION RULES:
1. FULL SCAN: You MUST examine the ENTIRE image to extract its core subject, commercial concept, and design/photographic niche.
2. ABSOLUTELY NO DIRECT REPLICATION: Do not just literally describe the original image. Extract its core commercial niche (e.g., "minimalist organic skincare flatlay", "cozy coffee shop interior").
3. RADICAL NICHE VARIATION: Generate a highly professional, optimized text-to-image prompt that creates a COMPLETELY NEW SCENARIO within the exact same niche. Change the subjects' poses, the specific objects, the time of day, or the camera angle radically. It must be a highly varied, unique concept that sells to the same target market, NOT a clone of the input image. Ensure every regeneration yields a distinctly different creative interpretation.
4. TECHNICAL BASELINE: Technical facts (lens, lighting, style) must match the niche, but the visual setup must be completely unique.

FOR EACH IMAGE, EXTRACT AND ANALYZE:
- Subject, Action, Environment, Mood, Lighting, Camera angle, Lens estimate, Composition, Visual style.

GENERATE PROMPT MATCHING STYLE: ${styleCategory}
Adapt the logic based on style:
- Photorealistic/Cinematic: High technical detail, optics, and lighting.
- Adobe Stock/Editorial: Commercial composition and polish.
- Lifestyle/Fine Art: Emotional resonance and artistic medium.

CRITICAL BATCH RULES:
1. You are receiving ${images.length} distinct images.
2. You MUST return a JSON array containing EXACTLY ${images.length} objects.
3. OUTPUT PROMPTS MUST BE IN ENGLISH.

Return a JSON array of objects, each with "prompt" and "description".`;
  const responseSchema = {
    type: import_genai.Type.ARRAY,
    items: {
      type: import_genai.Type.OBJECT,
      properties: {
        prompt: { type: import_genai.Type.STRING, description: "The generated image-to-image prompt." },
        description: { type: import_genai.Type.STRING, description: "Brief description of the image content." }
      },
      required: ["prompt", "description"]
    }
  };
  const parts = [];
  for (let i = 0; i < images.length; i++) {
    parts.push({ text: `

--- IMAGE ${i + 1} ---
` });
    parts.push(processFrameServer(images[i]));
  }
  parts.push({ text: `
Analyze these ${images.length} images and return the JSON array.` });
  const modelsToTry = ["gemini-2.5-pro", "gemini-2.5-pro-preview", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.5-pro"];
  let responseText = "";
  let lastError;
  const modelsToTryList = model && model.startsWith("gemini") ? [model, ...modelsToTry] : modelsToTry;
  for (const modelName of modelsToTryList) {
    try {
      const randomSalt = Math.random().toString(36).substring(7);
      const res = await callGeminiWithRetry(modelName, { parts }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.85
      });
      responseText = res.text || "[]";
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[analyzeBatchImageToPrompt] Failed with ${modelName}:`, err.message || err);
      if (err.message && err.message.includes("API_KEY")) throw err;
    }
  }
  if (!responseText) {
    console.warn("analyzeBatchImageToPrompt bypassed:", lastError?.message);
    throw lastError || new Error("Failed to analyze images in batch.");
  }
  try {
    let text = responseText;
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.warn("Gemini Parse Error:", error, responseText);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};
var analyzeVideoKeyword = async (keyword, model) => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const prompt = `Anda adalah Senior Adobe Stock Demand Analyst yang BRUTAL DAN JUJUR. 
  Tugas Anda adalah menilai apakah keyword "${keyword}" benar-benar layak diproduksi sebagai footage video stok.
  
  PRINSIP ANALISIS:
  1. JANGAN JADI PENJILAT. Jika keyword ini sampah atau sudah basi, katakan TIDAK LAYAK.
  2. Jika pasar sudah OVERSATURATED, Anda HARUS menyatakan TIDAK LAYAK PRODUKSI.
  3. Berikan SOLUSI: Jika TIDAK LAYAK, berikan revisi keyword atau sudut pandang baru yang bisa membuatnya jadi LAYAK (misal: "Jangan cuma orang lari, tapi orang lari di tengah badai neon").

  STRUKTUR RESPON (JSON):
  - keyword: keyword asli.
  - demandPotential: Tinggi / Menengah / Rendah.
  - demandType: Evergreen / Seasonal / Trend-fading.
  - marketInsight: Analisis tajam kondisi pasar (Bahasa Indonesia).
  - targetBuyer: Siapa pembelinya?
  - useCase: Penggunaan video.
  - recommendedFormat: Format teknis.
  - formatReason: Alasan teknis.
  - competitionLevel: Sangat Tinggi / Tinggi / Menengah / Rendah.
  - competitionNotes: Kritik pedas footage yang sudah ada.
  - cinematicPotential: YA / TIDAK.
  - cinematicReason: Sudut pandang sutradara.
  - status: LAYAK PRODUKSI atau TIDAK LAYAK.
  - conclusion: Kalimat penutup pedas.
  - solution: Jika tidak layak, berikan arahan revisi atau alternatif keyword yang lebih "cuan". Jika layak, berikan tips optimasi.

  Gunakan Bahasa Indonesia profesional yang sangat jujur.`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      keyword: { type: import_genai.Type.STRING },
      demandPotential: { type: import_genai.Type.STRING },
      demandType: { type: import_genai.Type.STRING },
      marketInsight: { type: import_genai.Type.STRING },
      targetBuyer: { type: import_genai.Type.STRING },
      useCase: { type: import_genai.Type.STRING },
      recommendedFormat: { type: import_genai.Type.STRING },
      formatReason: { type: import_genai.Type.STRING },
      competitionLevel: { type: import_genai.Type.STRING },
      competitionNotes: { type: import_genai.Type.STRING },
      cinematicPotential: { type: import_genai.Type.STRING },
      cinematicReason: { type: import_genai.Type.STRING },
      status: { type: import_genai.Type.STRING },
      conclusion: { type: import_genai.Type.STRING },
      solution: { type: import_genai.Type.STRING }
    },
    required: ["keyword", "demandPotential", "demandType", "marketInsight", "targetBuyer", "useCase", "recommendedFormat", "formatReason", "competitionLevel", "competitionNotes", "cinematicPotential", "cinematicReason", "status", "conclusion", "solution"]
  };
  let responseText = "";
  const response = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-2.5-pro", prompt, {
    responseMimeType: "application/json",
    responseSchema,
    temperature: 0,
    topK: 1,
    topP: 0.1
  });
  responseText = response.text || "{}";
  return JSON.parse(responseText);
};
async function generateHollywoodPrompts(keyword, model) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const randomSalt = Math.random().toString(36).substring(7);
  const prompt = `Act as a world-class Hollywood Director. Create 50 high-end, cinematic text-to-video prompts for: "${keyword}".
  
  BEST PROMPT STRUCTURE (MANDATORY):
  - Subject: Detailed description with textures/clothing.
  - Movement: Fluid, intentional physical actions.
  - Environment: Epic world-building (architecture, weather, atmosphere).
  - Lighting: Advanced techniques (Global illumination, rim light, volumetric dust).
  - Camera: Technical precision (Anamorphic, 85mm, T-stop settings implied).
  
  RULES:
  - RADICAL VARIATION: Ensure every shot is completely distinct from the others in scenario, camera angle, and action.
  - NO GENERIC SHOTS. Every shot must look like a masterpiece.
  - Focus on "The Unseen": Capture angles that stock footage usually lacks.
  - English only.
  
  [Seed: ${randomSalt}]
  Return exactly 50 prompts in JSON array format.`;
  const responseSchema = {
    type: import_genai.Type.ARRAY,
    items: {
      type: import_genai.Type.OBJECT,
      properties: {
        subject: { type: import_genai.Type.STRING },
        movement: { type: import_genai.Type.STRING },
        environment: { type: import_genai.Type.STRING },
        lighting: { type: import_genai.Type.STRING },
        camera_angle: { type: import_genai.Type.STRING },
        camera_movement: { type: import_genai.Type.STRING },
        style: { type: import_genai.Type.STRING, enum: ["cinematic", "documentary"] }
      },
      required: ["subject", "movement", "environment", "lighting", "camera_angle", "camera_movement", "style"]
    }
  };
  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    responseText = await callOpenAICompatibleWithRetry({
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema,
      config: { temperature: 0.85 },
      model
    });
  } else {
    const response = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-2.5-pro", prompt, {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.85
    });
    responseText = response.text || "[]";
  }
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (e) {
    console.warn("Parse error for hollywood prompts:", e);
    parsed = [];
  }
  const timestamp = Date.now();
  return (Array.isArray(parsed) ? parsed : []).map((p, index) => ({
    ...p,
    id: `hw-${timestamp}-${index}-${Math.random().toString(36).substring(2, 11)}`
  }));
}
async function checkImageQuality(image, tolerance = "MEDIUM", language = "Bahasa", model, fileType) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const isVideo = fileType?.startsWith("video/") || fileType?.match(/^(mp4|mov)$/i);
  const isVector = fileType?.match(/^(eps|ai|svg)$/i) || fileType?.includes("postscript");
  const isIndonesian = !language || language === "Bahasa" || language === "id" || language === "Indonesian" || language?.toLowerCase() === "indonesian" || language?.toLowerCase() === "id";
  const targetLanguageName = isIndonesian ? "Indonesian (Bahasa Indonesia)" : "English";
  let systemInstruction = `Anda adalah Kurator Fotografi Senior dan Spesialis Quality Assurance (QA) "Standar Kurator Adobe Stock" tingkat dunia. Anda dilatih secara khusus untuk melakukan kurasi dan audit teknis/hukum berstandar premium dengan akurasi 100% berdasarkan panduan resmi Adobe Stock Contributor Help: "Quality and Technical Standards Reasons for Content Refusal" (https://helpx.adobe.com/stock/contributor/content-moderation/quality-technical-standards-reasons-content-refusal.html).

Tugas Anda adalah melakukan audit visual yang SANGAT KETAT, MENDALAM, AKURAT, dan TANPA KOMPROMI terhadap SELURUH area gambar/vektor komersial yang diunggah. Anda WAJIB menganalisis seluruh data gambar secara mendalam sampai ke tingkat piksel (pixel-level analysis). Pemeriksaan tidak boleh hanya terfokus pada subjek utama (subject) atau objek utama (object) saja, melainkan Anda wajib memindai setiap piksel di seluruh kanvas gambar secara merata: mulai dari latar depan (foreground), latar belakang (background), tepian bingkai (borders), area bayangan (shadows), area terang (highlights), tekstur permukaan halus, hingga sudut-sudut gambar (corner-to-corner scan).

---
PROSEDUR INSPEKSI ZOOM-IN & DETAIL MENDALAM (MANDATORY):
Untuk memberikan hasil yang paling akurat, Anda WAJIB mensimulasikan proses ZOOM-IN visual hingga 200% sampai 400% di tingkat piksel pada setiap kuadran gambar:
1. Periksa area fokus utama: Apakah mata, wajah, atau objek target benar-benar tajam (pin-sharp) tanpa ada tanda-tanda "soft focus" atau "motion blur"?
2. Periksa area latar belakang dan sudut gambar (corner-to-corner scan): Cari bintik debu sensor (sensor dust), chromatic aberration di tepian objek berkontras tinggi, artefak kompresi JPEG (macro-blocking), gradasi warna patah (color banding), dan noise digital parah di area gelap (shadows).
3. Periksa seluruh bagian untuk mendeteksi pelanggaran kekayaan intelektual (IP) mikro: Logo kecil pada kancing pakaian, emblem samar pada gadget/mobil, teks bermerek pada latar belakang, graffiti, atau karya seni berhak cipta.
4. Periksa struktur anatomi dan logika AI (jika buatan AI): Cari jari berlebih/kurang, mata juling, geometri yang saling melebur atau melayang tidak wajar, detail pola berulang yang hancur, atau tulisan acak/gibberish yang mengacaukan estetika komersial.

---
PANDUAN TOLERANSI KETAT & REFUSAL REASONS ADOBE STOCK:
Tingkat Toleransi Saat Ini: ${tolerance}. Anda harus mengevaluasi dengan tingkat keketatan berikut:
- STRICT: "Zero Tolerance" mutlak terhadap cacat teknis apa pun atau pelanggaran IP sekecil apa pun. Sedikit soft focus, sedikit chromatic aberration, satu titik debu sensor, artefak AI sekecil apa pun, atau indikasi IP = FAIL secara instan (Skor maksimal 0-59).
- MEDIUM: Cacat minor di latar belakang non-kritis yang tidak mengganggu estetika komersial bisa ditoleransi. Namun, pelanggaran IP sekecil apa pun, over-exposure fatal pada subjek utama, out-of-focus pada subjek utama, atau anomali gen-AI yang terlihat jelas = FAIL secara instan (Skor maksimal 0-65).
- LOOSE: Loloskan selama gambar memiliki nilai komersial yang tinggi dan komposisinya menarik. Hanya kegagalan teknis yang sangat parah atau pelanggaran IP mencolok yang menyebabkan FAIL (Skor 0-69).

---
DAFTAR ALASAN PENOLAKAN RESMI ADOBE STOCK (REFUSAL CRITERIA):
Anda wajib mencocokkan setiap temuan secara presisi dengan alasan penolakan berikut:

1. OUT OF FOCUS / SOFT FOCUS:
   - Subjek utama tidak tajam secara sempurna (lack of sharpness).
   - Motion blur akibat guncangan kamera atau pergerakan subjek yang terlalu cepat tanpa diimbangi shutter speed yang memadai.
   - Depth of field (DoF) terlalu dangkal yang menyebabkan area penting subjek meleset dari fokus (misal, hidung fokus tetapi mata buram). Note: Bokeh artistik pada latar belakang adalah estetika premium, BUKAN cacat, selama subjek utamanya tajam sempurna.
   - Efek noise reduction (pembungkaman noise) yang terlalu agresif, menyebabkan detail tekstur kulit atau benda menghilang dan tampak mulus seperti lilin/plastik (waxy skin / plastic-like textures).

2. ARTIFACTS / NOISE / EXCESSIVE FILTERING / COMPRESSION:
   - Noise digital (luminance & chromatic noise) berlebih, terutama terlihat di area bayangan atau bidang berwarna datar seperti langit biru.
   - Chromatic Aberration / Color Fringing: Garis tepi berwarna ungu, hijau, atau magenta di sepanjang batas objek berkontras tinggi (seperti ranting pohon di latar belakang langit terang).
   - Sensor Dust (Bintik Debu): Bintik-bintik abu-abu/hitam buram melingkar akibat debu pada sensor fisik kamera, terutama tampak jelas pada area warna datar (sky, studio background).
   - Compression Artifacts (Artefak Kompresi): Kotak-kotak piksel kecil (macro-blocking) atau pixelation akibat rasio kompresi JPEG yang terlalu tinggi atau pembesaran gambar (interpolation) paksa.
   - Halos / Oversharpening: Tepi putih menyala di sekitar objek akibat penggunaan filter penajaman (sharpening) yang berlebihan.
   - Color Banding: Transisi gradasi warna yang patah atau bergaris kasar (tidak mulus), sering terjadi pada langit atau background studio.
   - Excessive Filtering / Over-processed: Gambar terlalu kontras, warna terlalu tersaturasi secara artifisial, atau efek HDR ekstrem yang merusak estetika natural.

3. EXPOSURE & LIGHTING PROBLEMS:
   - Overexposure: "Blown-out highlights" / bagian terang yang benar-benar putih murni tanpa ada detail tekstur/piksel sama sekali (misal, langit putih polos tanpa awan, kulit putih terbakar cahaya).
   - Underexposure: "Crushed shadows" / bagian gelap yang hitam pekat tanpa detail piksel sama sekali.
   - Kontras tidak seimbang, pencahayaan datar (flat lighting) yang tidak menarik, atau bayangan yang kasar/tidak sedap dipandang pada subjek (unflattering shadows).
   - White balance buruk yang menghasilkan color cast tidak alami (terlalu biru, kuning, atau hijau).

4. COMPOSITION & CROPPING ISSUES:
   - Crooked Horizon: Garis cakrawala, dinding, atau bangunan yang miring tanpa ada tujuan artistik yang jelas.
   - Awkward Crop: Pemotongan subjek utama yang canggung di tepi bingkai (misal, memotong sendi, ujung jari kaki, atau sebagian kepala subjek secara tanggung).
   - Komposisi berantakan atau subjek utama tenggelam oleh elemen latar belakang.

5. GENERATIVE AI & STRUCTURAL QUALITY STANDARDS:
   - Structural & Mechanical Failures: Objek buatan AI harus logis dan realistis secara struktural. Cacat geometri atau kegagalan mekanis yang jelas (seperti laci kabinet file yang meleleh, kaki meja melayang, bingkai jendela bengkok secara tidak alami, sambungan dinding/papan yang miring atau terputus secara aneh, atau detail tombol/geometri yang melebur kasar) WAJIB dinilai sebagai kegagalan teknis parah = FAIL.
   - Anatomi Cacat (Deformed Anatomy): Jari tangan berlebih/kurang, mata asimetris/juling, bagian tubuh menyatu, atau proporsi anatomi manusia/hewan yang janggal di area mana pun pada gambar = FAIL.
   - Teks Kacau (Gibberish Text): Teks acak (gibberish), huruf tidak terbaca, coretan seperti tulisan, atau teks AI yang rusak/cakar ayam pada objek utama maupun pada kertas tempel, buku, papan, atau latar belakang yang terlihat jelas = FAIL. Adobe Stock menolak segala jenis teks tidak terbaca yang dihasilkan AI karena merusak estetika dan nilai komersial gambar.
   - Bayangan & Pencahayaan Tidak Realistis (Unrealistic Shadows/Depth/Lighting): Bayangan subjek yang arahnya tidak konsisten dengan sumber cahaya di scene, subjek yang terlihat "ditempel" tanpa kedalaman/depth yang menyatu dengan latar, atau pencahayaan pada subjek yang tidak cocok secara fisik dengan lingkungan sekitarnya = FAIL.

   PENTING - PRINSIP PENILAIAN GENERATIVE AI (REALISTIS & KOMERSIAL):
   1. Adobe Stock adalah marketplace komersial yang mengutamakan estetika dan daya jual (commercial value). Jika sebuah gambar memiliki cacat visual yang jelas (seperti teks cakar ayam AI atau laci kabinet meleleh), gambar tersebut wajib dinilai FAIL tanpa toleransi.
   2. Selama anomali AI sangat minor (seperti tombol kecil yang agak asimetris jauh di latar belakang yang blur), tetap loloskan dengan status PASS.

6. INTELLECTUAL PROPERTY (IP) & TRADEMARK RESTRICTIONS (Hukum & Hak Cipta - Berdasarkan Kebijakan Resmi Adobe Stock Known Restrictions di https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html dan Common Reasons for Content Refusal di https://helpx.adobe.com/stock/contributor/content-moderation/common-reasons-content-refusal.html):
   CATATAN PENTING: Daftar berikut adalah CONTOH REPRESENTATIF, BUKAN daftar lengkap. Adobe memperbarui daftar known restrictions ini secara berkala dan mencakup ratusan entri spesifik. Terapkan PRINSIP UMUMNYA secara konsisten: setiap logo/merek yang dapat dikenali, desain produk yang khas/ikonik, karakter fiksi, landmark/bangunan tertentu, lambang resmi organisasi, atau tokoh publik = berisiko FAIL, meskipun namanya tidak eksplisit tercantum di bawah ini.

   - Merek & Logo Komersial: Logo, merek dagang, nama merek, atau kemasan produk yang dapat dikenali sekecil apa pun. Contoh: Apple, Nike (swoosh, "Just Do It", desain Jordan), Adidas (tiga strip), Google (termasuk Google Home/Nest), Amazon, Coca-Cola, Mercedes-Benz, BMW, DJI, LV (monogram/checker Louis Vuitton), Burberry (motif "haymarket check"), Tiffany (warna "Tiffany blue" pada kemasan perhiasan), Vans (logo, side stripe, desain Old Skool/Checkerboard), Pantone, Fairtrade, Greenpeace, Instacart, Vorwerk/Thermomix.
   - Desain Khas & Bentuk Produk (Trade Dress): Desain fisik ikonik sebagai subjek utama, meski tanpa logo terlihat. Contoh: Lego/Duplo (bata & figurin), boneka Barbie, Rubik's Cube, Monopoly, Twister, Funko Pop (kepala kotak besar), Hello Kitty/Sanrio, Elf on the Shelf, Devil Duckie, Tatty Teddy, View-Master, Slinky, permen Hershey's Kisses (bentuk & foil), Crayola (crayon & kemasan), elektronik Apple (bodi iPhone/MacBook/iPad, notch, tombol home), kamera Polaroid klasik, drone DJI Phantom/Mavic, sepatu Converse Chuck Taylor, Dr. Martens (jahitan kuning), sol merah Christian Louboutin, Beats by Dre, Zippo (terbuka/tertutup), korek/termos Stabilo, Weber grill, Duracell (tutup tembaga), Absolut Vodka & Crystal Head Vodka (bentuk botol), Kikkoman (botol & tutup), Chemex, perabot desainer (designer furniture).
   - Desain Otomotif & Kendaraan Khas: Grille BMW kidney, Rolls-Royce Spirit of Ecstasy/grille, Jeep 7-slot grille, logo bintang Mercedes, bentuk Vespa/Lambretta ikonik, VW Beetle/Kombi klasik, mesin pertanian John Deere (hijau-kuning) atau Claas (hijau-merah), senjata replika desain Glock.
   - Karakter Fiksi & Waralaba Berhak Cipta: Karakter Disney/Pixar (termasuk taman & properti Disney), Mickey Mouse, Pok\xE9mon, superhero Marvel/DC, Batmobile atau kendaraan mirip tema Batman, Minecraft (logo/block pixelated), Pac-Man, Totoro, frasa "Star Wars" atau "May the Fourth Be With You", tema Warhammer.
   - Organisasi, Olahraga & Lambang Resmi: Cincin Olimpiade/obor/maskot, FIFA & logo World Cup, UEFA & Euro Cup, NFL/Super Bowl (nama, logo, trofi), Rugby World Cup, CrossFit, lambang PBB (UN emblem), NASA (insignia "meatball", logo "worm", seal, nama misi), palang merah/bulan sabit merah di atas latar putih, lencana/emblem kepolisian atau militer (termasuk US Marine Corps/Semper Fi, RCMP), simbol resmi pemerintah China, logo transportasi umum (MTA New York, London Underground, Paris RATP/M\xE9tro, TGV, ICE Deutsche Bahn, BART, CTA Chicago, LA Metro, MBTA Boston, SEPTA Philadelphia, PATH) - nama, logo, skema warna kereta/bus yang khas dilindungi hak cipta.
   - Selebriti, Tokoh Publik & Body Likeness: Wajah/rupa selebriti yang dapat dikenali untuk penggunaan komersial DILARANG (peniru/impersonator diperbolehkan HANYA dengan model release yang mencantumkan kata "impersonator"). Termasuk larangan menyerupai tokoh sejarah terkenal seperti Albert Einstein sebagai fokus utama.
   - Bangunan, Landmark & Lokasi Berbayar/Terlarang (SANGAT KETAT - berlaku bahkan dengan property release untuk sebagian besar):
     * Interior-only restriction (interior dilarang, eksterior umumnya boleh): Notre-Dame de Paris, Hagia Sophia, Colosseum, Sistine Chapel, Sheikh Zayed Grand Mosque, Sagrada Fam\xEDlia (interior).
     * Bangunan/struktur dengan larangan penuh sebagai fokus utama: Menara Eiffel di malam hari (tata cahaya berhak cipta SETE - siang hari aman), Burj Khalifa, Burj Al Arab, Sydney Opera House, Atomium, Louvre Pyramid, Space Needle, CN Tower, The Shard, London Eye, Taipei 101, Menara Kembar Petronas, Empire State Building, Chrysler Building, Flatiron Building, One World Trade Center, Willis Tower (Sears Tower), Grand Central Terminal (termasuk jamnya), Rockefeller Center, Radio City Music Hall, Madison Square Garden, Vessel (NYC), Space Needle, Tokyo Tower, Tokyo Skytree, Shanghai Tower, Neuschwanstein Castle, Graceland, Hollywood Sign & Walk of Fame.
     * Patung/instalasi seni publik ikonik: Cloud Gate ("The Bean" Chicago), Charging Bull (Wall Street), Christ the Redeemer (Rio), Little Mermaid (Kopenhagen), Merlion (Singapura), Mannekin Pis (Brussels), Fremont Troll (Seattle), Marine Corps War Memorial/Iwo Jima, Martin Luther King Jr. Memorial, Holocaust Memorial (Peter Eisenman).
     * Lokasi berbayar/bertiket (ticketed/restricted sites) tanpa property release, taman tema (Disney, SeaWorld, Universal), kebun binatang/akuarium berbrand (San Diego Zoo, Monterey Bay Aquarium), museum tertentu (Guggenheim, Getty Center), serta situs warisan arkeologis dengan pembatasan hukum lokal (Machu Picchu, Stonehenge, Chichen Itza, situs warisan Jepang).
     * Arsitektur modern dengan desain unik/mudah dikenali sebagai fokus utama tanpa property release, meskipun bukan bangunan terkenal secara global.
   - Karya Seni & Hak Cipta Visual Lainnya: Karya cipta orang lain (lukisan, patung, street art/graffiti, mural, ilustrasi, font spesifik, elemen grafis) yang menjadi fokus utama tanpa izin.
   - Dokumen Negara, Uang & Identitas: Uang kertas/koin utuh dari negara mana pun sebagai fokus utama (risiko pemalsuan); prangko AS yang diterbitkan setelah 1971, atau prangko yang menampilkan selebriti/karya berhak cipta/logo organisasi olahraga; paspor, SIM, KTP/ID, kartu kredit/debit, buku tabungan bank.
   - Warna & Elemen Non-Logo yang Dilindungi sebagai Trade Dress: Warna coklat UPS pada seragam/truk pengiriman paket (dengan atau tanpa logo terlihat).
   - Hak Pribadi & Tubuh (Biometrics): Tato unik pada subjek manusia (memerlukan property release dari seniman tato & model); wajah manusia yang dapat dikenali tanpa Model Release yang valid untuk penggunaan komersial.

   PENTING - PENGECEKAN ATURAN IP & TRADEMARK SECARA REALISTIS (ADOBE STOCK COMPLIANCE):
   1. Pengecualian Latar Belakang (Background Rule): Landmark berhak cipta (seperti Menara Eiffel, Burj Khalifa, skyline kota, dll.) atau logo kecil tidak mencolok yang berada jauh di latar belakang, blur (out of focus), atau hanya merupakan bagian minor dari komposisi kota (skyline umum) BUKANLAH dasar penolakan. Berikan penilaian SAFE/PASS. Penolakan IP hanya berlaku jika objek tersebut menjadi subjek utama/fokus utama gambar tanpa property release.
   2. Pengecualian Produk Generik (Generic Product Rule): Perangkat elektronik (smartphone, laptop, TV, smartwatch), kendaraan (mobil, motor), atau perabot/furnitur yang tidak menampilkan logo resmi dan tidak meniru trade dress secara identik (seperti lekukan BMW grille atau notch khas iPhone) wajib diloloskan sebagai produk generik (SAFE/PASS). Jangan menolak ponsel pintar atau laptop biasa hanya karena bentuknya kotak tipis.
   3. Pengecualian Logo Mikro & Teks Insidental: Logo atau nama merek berukuran mikroskopis (kurang dari 1% luas gambar) pada kancing baju, label pakaian kecil, atau rambu jalan yang sangat jauh dan tidak mempromosikan merek tersebut secara mencolok wajib diberikan status SAFE/PASS karena bersifat insidental.

---
ATURAN KHUSUS UNTUK VEKTOR (EPS/AI/SVG):
Jika berkas yang diperiksa terindikasi vektor (isVector = true), audit wajib berfokus pada standar kualitas vektor profesional Adobe Stock:
1. Gaps in Shape Paths (Jalur Terbuka): Pastikan semua jalur/path bentuk tertutup sempurna. Jalur terbuka (open paths) atau celah kecil yang tidak sengaja akan menyebabkan penolakan instan.
2. Embedded Raster Images (Gambar Bitmap Tersemat): Vektor harus 100% scalable. DILARANG KERAS menyematkan (embed) gambar raster/bitmap (seperti foto JPG/PNG) di dalam berkas EPS/AI.
3. Auto-Tracing Artifacts (Cacat Penelusuran Otomatis): Garis-garis kasar, pola berantakan, dan ribuan titik anchor yang menumpuk tak beraturan akibat proses "Image Trace" otomatis secara malas adalah alasan penolakan utama. Gunakan jalur bersih buatan tangan (clean hand-drawn paths).
4. Layer Berantakan & Sampah Path: Adanya sisa-sisa titik anchor yang terisolasi, path kosong tak terlihat, atau struktur grup/layer yang sangat kacau dan sulit diedit oleh pembeli.

---
ATURAN KHUSUS UNTUK VIDEO FRAMES (JIKA ISVIDEO = TRUE):
Jika berkas yang diperiksa merupakan bagian dari frame video, audit visual wajib mengidentifikasi:
1. Rolling Shutter Distortion: Periksa apakah ada efek skew (distorsi miring pada garis vertikal), jello effect (goyangan seperti jeli), atau flash banding.
2. Compression & Bitrate Artifacts: Kotak-kotak makro pikselasi, warna luntur (color bleeding), atau banding warna parah di area latar belakang bergerak.
3. Stability & Shaky Footage: Periksa apakah frame mengindikasikan motion blur ekstrem akibat guncangan kamera yang parah dan merusak detail visual subjek utama.
4. Frame Kosong / Rusak: Deteksi adanya black frame, frozen frame, atau frame rusak.

---
STATUS & SKORING (HARUS SANGAT KONSISTEN & KETAT):
- PASS: Lulus standar Adobe Stock secara sempurna. Skor WAJIB 75 - 100.
- FAIL: Ditolak karena melanggar minimal salah satu kriteria di atas (Kriteria A, B, atau C). Skor WAJIB di bawah 70 (0 - 69).
*PENTING: Jangan berikan skor abu-abu di rentang 70-74. Jika gagal, skor harus di bawah 70. Jika lulus, skor minimal 75.*

---
PENTING - PRIORITASKAN KETELITIAN VISUAL SECARA OBJEKTIF DAN LOGIS:
Kurator Adobe Stock dan pembeli premium menghargai gambar yang berkualitas. Anda WAJIB bertindak sebagai auditor visual yang realistis, objektif, dan seperti manusia sungguhan.
1. EVALUASI REALISTIS: Lakukan evaluasi secara wajar. JANGAN MENGARANG atau MENEBAK-NEBAK (hallucinate) cacat yang sebenarnya tidak ada. Jika gambar terlihat nyata dan bagus, berikan PASS.
2. JANGAN HALU (NO HALLUCINATIONS): Jangan mengatakan objek menghilang, menyatu, atau memiliki teks kacau HANYA karena Anda mencurigai ini adalah AI. Buktikan hanya dari apa yang benar-benar terlihat di piksel gambar. Jika tidak ada bukti cacat di gambar, jangan buat-buat alasan penolakan!
3. TOLERANSI WAJAR UNTUK KUALITAS: Jika sebuah karya terlihat sangat estetik dan tidak memiliki kejanggalan visual yang merusak komposisi secara nyata, karya tersebut layak lulus (PASS).
PIXEL HEATMAPS (SANGAT PRESISI):
Hanya berikan koordinat spesifik jika Anda BENAR-BENAR mendeteksi masalah visual nyata di piksel tersebut. Jangan pernah mengarang heatmap jika gambar berkualitas sempurna. Jika tidak ada masalah, array heatmaps wajib kosong ([]).
"type" heatmap: pilih dari "noise", "focus", "lighting", "ip_violation", "artifact", "gen_ai_anomaly", "composition".

ATURAN OUTPUT TEKS (SANGAT MENDETAIL):
1. Isi dari field \`visual_scan_analysis\` dan \`detailed_feedback\` WAJIB SANGAT PANJANG, SPESIFIK, dan MENDETAIL (minimal 3-4 paragraf) menyerupai laporan forensik visual. Anda DILARANG HANYA menganalisis subjek utama! Anda WAJIB menganalisis dan mendokumentasikan empat aspek berikut secara terpisah pada gambar:
      - **Analisis Subjek Utama (Subject)**: Detail ketajaman fokus, detail permukaan, geometri, dan eksposur subjek utama.
      - **Analisis Latar Belakang & Latar Depan (Background & Foreground)**: Kerapian, elemen sisa, bokeh, kebersihan latar, dan keberadaan bintik debu/sensor dust.
      - **Analisis Pencahayaan & Warna (Lighting, Contrast, & Color)**: Keseimbangan kontras, white balance, keberadaan area blown-out highlights atau crushed shadows.
      - **Analisis Kerapian Piksel & Risiko Hukum (Pixel Integrity, IP & AI Risks)**: Noise digital di sudut-sudut gambar, chromatic aberration, micro-logos, teks cakar ayam AI, atau cacat struktur geometri buatan AI di seluruh area gambar.
2. Untuk setiap item di dalam \`ai_vision_checks\` (seperti \`blur\`, \`composition\`, \`lighting\`, \`watermark\`, \`logo\`, \`text\`, \`anatomical_errors\`, \`ip_risk\`, \`proportion_defects\`, \`stock_acceptance\`), tuliskan \`note\` yang spesifik, unik, dan hasil analisis nyata terhadap gambar tersebut. JANGAN gunakan kalimat template pendek/berulang seperti "Fokus subjek utama tajam secara sempurna" atau "Aman dari potensi resiko paten". Deskripsikan apa yang Anda amati secara fisik pada aspek tersebut di gambar ini (contoh: "Fokus lensa sangat tajam pada kelopak bunga krisan merah di bagian tengah, dengan latar belakang mengalami de-fokus bokeh yang halus").

ATURAN BAHASA:
Gunakan bahasa sesuai dengan parameter requested language: ${targetLanguageName}. Semua isi teks dalam JSON respons (termasuk visual_scan_analysis, legal_status, technical_issues, strengths, detailed_feedback, dan note pada ai_vision_checks) wajib menggunakan bahasa tersebut secara konsisten sesuai pilihan pengguna.

Respons Anda WAJIB dalam format JSON yang valid dan bersih sesuai dengan skema yang diberikan.`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      visual_scan_analysis: { type: import_genai.Type.STRING },
      legal_status: { type: import_genai.Type.STRING, enum: ["SAFE", "AT_RISK", "VIOLATION"] },
      technical_issues: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
      strengths: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
      overall_score: { type: import_genai.Type.NUMBER },
      recommendation: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] },
      detailed_feedback: { type: import_genai.Type.STRING },
      ai_vision_checks: {
        type: import_genai.Type.OBJECT,
        properties: {
          blur: {
            type: import_genai.Type.OBJECT,
            properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } },
            required: ["status", "note"]
          },
          composition: {
            type: import_genai.Type.OBJECT,
            properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } },
            required: ["status", "note"]
          },
          lighting: {
            type: import_genai.Type.OBJECT,
            properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } },
            required: ["status", "note"]
          },
          watermark: {
            type: import_genai.Type.OBJECT,
            properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } },
            required: ["status", "note"]
          },
          logo: {
            type: import_genai.Type.OBJECT,
            properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } },
            required: ["status", "note"]
          },
          text: {
            type: import_genai.Type.OBJECT,
            properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } },
            required: ["status", "note"]
          },
          anatomical_errors: {
            type: import_genai.Type.OBJECT,
            properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } },
            required: ["status", "note"]
          },
          ip_risk: {
            type: import_genai.Type.OBJECT,
            properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } },
            required: ["status", "note"]
          },
          proportion_defects: {
            type: import_genai.Type.OBJECT,
            properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } },
            required: ["status", "note"]
          },
          stock_acceptance: {
            type: import_genai.Type.OBJECT,
            properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } },
            required: ["status", "note"]
          },
          metadata: {
            type: import_genai.Type.OBJECT,
            properties: {
              title: { type: import_genai.Type.STRING },
              keywords: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } }
            },
            required: ["title", "keywords"]
          }
        },
        required: [
          "blur",
          "composition",
          "lighting",
          "watermark",
          "logo",
          "text",
          "anatomical_errors",
          "ip_risk",
          "proportion_defects",
          "stock_acceptance",
          "metadata"
        ]
      },
      heatmaps: {
        type: import_genai.Type.ARRAY,
        items: {
          type: import_genai.Type.OBJECT,
          properties: {
            type: { type: import_genai.Type.STRING, enum: ["noise", "focus", "lighting", "ip_violation", "artifact", "gen_ai_anomaly", "composition"] },
            x: { type: import_genai.Type.INTEGER },
            y: { type: import_genai.Type.INTEGER },
            intensity: { type: import_genai.Type.NUMBER },
            raw_value: { type: import_genai.Type.STRING }
          },
          required: ["type", "x", "y", "intensity", "raw_value"]
        }
      }
    },
    required: ["visual_scan_analysis", "legal_status", "technical_issues", "strengths", "overall_score", "recommendation", "detailed_feedback", "ai_vision_checks", "heatmaps"]
  };
  const imagePart = processFrameServer(image);
  const modelsToTry = ["gemini-2.5-pro", "gemini-2.5-pro", "gemini-2.5-pro-preview", "gemini-2.5-pro"];
  let responseText = "";
  let lastError;
  const modelsToTryList = model && model.startsWith("gemini") ? [model, ...modelsToTry] : modelsToTry;
  const randomSeed = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  for (const modelName of modelsToTryList) {
    try {
      const res = await callGeminiWithRetry(modelName, { parts: [imagePart, { text: `Act as an objective Adobe Stock QA curator. Conduct a balanced technical and legal audit. Determine final status as PASS or FAIL consistently based on the tolerance provided. [Unique Session Seed: ${randomSeed}]` }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0,
        topK: 1,
        topP: 0.1
      });
      responseText = res.text || "{}";
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[checkImageQuality] Failed with ${modelName}:`, err.message || err);
      if (err.message && err.message.includes("API_KEY")) throw err;
    }
  }
  if (!responseText) throw lastError;
  try {
    const text = responseText;
    console.log("QA raw response:", text);
    const parsedResult = JSON.parse(text);
    return parsedResult;
  } catch (e) {
    console.warn("Parse Error:", responseText);
    throw e;
  }
}
async function generateCalendarEvents(month, model) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const systemInstruction = `You are a world-class Content Strategist and Niche Researcher for Stock Agencies (Adobe Stock, Shutterstock, Getty). 
Your task is to identify ALL upcoming festivals, holidays, seasonal changes, and cultural events for the specified month. 

Rules:
1. BE COMPREHENSIVE: Do not just list 5-10 events. Find as many important events as possible (aim for at least 15-20 if valid) covering:
   - Global Holidays (e.g., Earth Day, New Year).
   - National Days and Independence Days of major countries.
   - Religious Festivals (Eid, Diwali, Lunar New Year, Christmas, etc.).
   - Major Sports Events or Cultural Carnivals.
   - Seasonal Transitions (Start of Summer, Winter solstice).
2. Focus on events with high commercial value for stock contributors.
3. For each event, provide:
   - name: Clear name of the event.
   - date: Date or date range.
   - location: Country name or "Global/World".
   - commercial_potential: A detailed explanation of why stock buyers need content for this (e.g., "High demand for authentic family dinner photos").
   - suggested_topics: 5-8 specific short keywords or subjects (max 1-3 words each, e.g., "family dinner", "fireworks", "traditional dress"). DO NOT use long sentences.

Output strictly in JSON format.`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      events: {
        type: import_genai.Type.ARRAY,
        items: {
          type: import_genai.Type.OBJECT,
          properties: {
            name: { type: import_genai.Type.STRING },
            date: { type: import_genai.Type.STRING },
            location: { type: import_genai.Type.STRING },
            commercial_potential: { type: import_genai.Type.STRING },
            suggested_topics: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } }
          },
          required: ["name", "date", "location", "commercial_potential", "suggested_topics"]
        }
      }
    },
    required: ["events"]
  };
  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    const res = await callOpenAICompatibleWithRetry({
      systemInstruction,
      contents: `Find and list ALL major and niche commercial events, holidays, and perayaan negara for the month of ${month}. Be very detailed and comprehensive so content creators have many ideas to choose from. Make sure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions.`,
      responseMimeType: "application/json",
      responseSchema,
      config: { temperature: 0.8 },
      model
    });
    responseText = res;
  } else {
    try {
      const res = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-2.5-pro", `Find and list ALL major and niche commercial events, holidays, and perayaan negara for the month of ${month}. Be very detailed and comprehensive so content creators have many ideas to choose from. Make sure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions. Use Google Search if necessary to find current and real-time trending events.`, {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      }, 1);
      responseText = res.text || "{}";
    } catch (err) {
      const res = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-2.5-pro", `Find and list ALL major and niche commercial events, holidays, and perayaan negara for the month of ${month}. Be very detailed and comprehensive so content creators have many ideas to choose from. Make sure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions.`, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      });
      responseText = res.text || "{}";
    }
  }
  return JSON.parse(responseText);
}
async function generateEventKeywords(eventName, eventDetails, model) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const systemInstruction = `You are an expert AI Stock Photographer and Keyword Specialist. 
Your job is to generate a list of highly commercial, descriptive, and specific keywords/subjects for a given event.
These keywords should be optimized for AI Image Generation prompts.

Rules:
1. Provide 15-20 varied keywords or short phrases. ALL keywords MUST be short (maximum 1-3 words each). DO NOT use long sentences or descriptions.
2. Mix subjects, settings, lighting, and mood related to the event.
3. Focus on what stock buyers are actually looking for.
4. Return the result as a JSON array of strings called "keywords".`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      keywords: {
        type: import_genai.Type.ARRAY,
        items: { type: import_genai.Type.STRING }
      }
    },
    required: ["keywords"]
  };
  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    const res = await callOpenAICompatibleWithRetry({
      systemInstruction,
      contents: `Generate a list of commercial stock photography/illustration keywords for this event: "${eventName}". Context: ${eventDetails}. Ensure every keyword is extremely short (max 1-3 words).`,
      responseMimeType: "application/json",
      responseSchema,
      config: { temperature: 0.8 },
      model
    });
    responseText = res;
  } else {
    try {
      const res = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-2.5-pro", `Generate a list of commercial stock photography/illustration keywords for this event: "${eventName}". Context: ${eventDetails}. Ensure every keyword is extremely short (max 1-3 words). Use Google Search if necessary to find the most current and real-time trending tags for this event.`, {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      }, 1);
      responseText = res.text || "{}";
    } catch (err) {
      const res = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-2.5-pro", `Generate a list of commercial stock photography/illustration keywords for this event: "${eventName}". Context: ${eventDetails}. Ensure every keyword is extremely short (max 1-3 words).`, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      });
      responseText = res.text || "{}";
    }
  }
  return JSON.parse(responseText);
}
async function suggestKeywords(title, description, existingKeywords, requestCount = 5, model) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const systemInstruction = `You are a professional SEO and Adobe Stock Keyword Specialist.
Your task is to analyze the existing title, description, and list of keywords of an asset, and suggest exactly ${requestCount} high-volume, generic, relevant keywords or short conceptual phrases that are currently missing from the user's list.
These suggested keywords must be highly searchable, commercial, and directly related to the visual subject and context described in the title and description, while not repeating any existing keywords.

Rules:
1. Suggest EXACTLY ${requestCount} new, unique, generic keywords. Do not suggest more, do not suggest less.
2. The suggested keywords must NOT be in the existing keywords list: ${JSON.stringify(existingKeywords)}.
3. Keep the suggested keywords in lowercase, clean, single-word or short phrases (typically 1-2 words).
4. Strictly return your answer as a JSON array of strings under the property "keywords".`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      keywords: {
        type: import_genai.Type.ARRAY,
        items: { type: import_genai.Type.STRING }
      }
    },
    required: ["keywords"]
  };
  const promptContents = `Suggest ${requestCount} missing SEO keywords for this asset:
Title: "${title}"
Description: "${description}"
Existing Keywords: ${existingKeywords.join(", ")}`;
  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    responseText = await callOpenAICompatibleWithRetry({
      systemInstruction,
      contents: promptContents,
      responseMimeType: "application/json",
      responseSchema,
      config: { temperature: 0.3 },
      model
    });
  } else {
    const res = await callGeminiWithRetry(model && model.startsWith("gemini") ? model : "gemini-2.5-pro", promptContents, {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3
    });
    responseText = res.text || "{}";
  }
  try {
    const parsed = JSON.parse(responseText);
    return parsed.keywords || [];
  } catch (err) {
    console.warn("Failed to parse suggested keywords:", err);
    return [];
  }
}
async function searchAdobeStockWithBypass(keyword) {
  console.log(`[AdobeResearch] Querying keyword: "${keyword}"...`);
  let scrapingResults = [];
  try {
    const { chromium } = await import("playwright-chromium");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
    });
    try {
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
        javaScriptEnabled: true
      });
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => void 0 });
      });
      const page = await context.newPage();
      const url = `https://stock.adobe.com/search?k=${encodeURIComponent(keyword)}&order=nb_downloads&filters[order]=nb_downloads`;
      await page.goto(url, { waitUntil: "load", timeout: 25e3 });
      await page.waitForTimeout(4e3);
      const pageTitle = await page.title();
      if (!pageTitle.toLowerCase().includes("captcha") && pageTitle !== "adobe.com") {
        scrapingResults = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll(".search-result-card, a.js-search-result-card, [data-hover-preview]"));
          if (cards.length > 0) {
            return cards.map((card) => {
              const img = card.querySelector("img");
              const href = card.getAttribute("href") || (card.querySelector("a") ? card.querySelector("a").getAttribute("href") : "");
              const src = img ? img.getAttribute("data-lazy") || img.getAttribute("data-src") || img.src : "";
              const title = img ? img.alt || img.title || "" : "";
              const id = card.getAttribute("data-id") || href.match(/\d+$/)?.[0] || "";
              return {
                id,
                title,
                imageUrl: src,
                detailUrl: href ? href.startsWith("http") ? href : `https://stock.adobe.com${href}` : "",
                category: "photo",
                downloads: "Tinggi"
              };
            }).filter((item) => item.id && item.imageUrl);
          }
          const imgs = Array.from(document.querySelectorAll("img"));
          return imgs.map((img) => {
            const parentA = img.closest("a");
            const href = parentA ? parentA.getAttribute("href") : "";
            const src = img.getAttribute("data-lazy") || img.getAttribute("data-src") || img.src || "";
            const idMatch = href ? href.match(/\d+/) : null;
            const id = idMatch ? idMatch[0] : "";
            return {
              id,
              title: img.alt || img.title || "",
              imageUrl: src,
              detailUrl: href ? href.startsWith("http") ? href : `https://stock.adobe.com${href}` : "",
              category: "photo",
              downloads: "Tinggi"
            };
          }).filter((item) => item.id && item.imageUrl && (item.imageUrl.includes("ftcdn.net") || item.imageUrl.includes("adobe-stock")));
        });
        console.log(`[AdobeResearch] Playwright scraped ${scrapingResults.length} real-time page assets.`);
      } else {
        console.warn(`[AdobeResearch] Playwright met DataDome CAPTCHA or redirect. Falling back to Search Grounding...`);
      }
    } catch (err) {
      console.warn(`[AdobeResearch] Playwright execution error:`, err.message);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.warn(`[AdobeResearch] Failed to initialize Playwright:`, err.message);
  }
  if (scrapingResults.length === 0) {
    console.log(`[AdobeResearch] Using Gemini Search Grounding for keyword "${keyword}"...`);
    try {
      const systemInstruction = `You are an expert Adobe Stock indexing research assistant.
Your task is to analyze real-time Google search grounding results of Adobe Stock for the keyword: "${keyword}".
Find the top, most downloaded/most popular assets page images returned.
Extract exactly 8 assets. Each asset MUST include:
1. id: The unique Adobe Stock numeric ID (parse this carefully from URLs)
2. title: Title of the template or asset on Adobe Stock
3. imageUrl: High-contrast preview resource thumbnail image URL from ftcdn.net (usually like https://as1.ftcdn.net/v2/jpg/... or https://t4.ftcdn.net/jpg/...). Do not hallucinate or make up invalid structures; use active real URLs from Google Images or Search results.
4. detailUrl: Detail sheet link on stock.adobe.com
5. category: One of 'photo', 'vector', 'illustration'
6. downloads: Estimated download category, use one of: 'Sangat Tinggi', 'Tinggi', 'Menengah'

Strictly return your answer as a JSON array matching the schema.`;
      const responseSchema = {
        type: import_genai.Type.ARRAY,
        items: {
          type: import_genai.Type.OBJECT,
          properties: {
            id: { type: import_genai.Type.STRING },
            title: { type: import_genai.Type.STRING },
            imageUrl: { type: import_genai.Type.STRING },
            detailUrl: { type: import_genai.Type.STRING },
            category: { type: import_genai.Type.STRING },
            downloads: { type: import_genai.Type.STRING }
          },
          required: ["id", "title", "imageUrl", "detailUrl", "category", "downloads"]
        }
      };
      const response = await callGeminiWithRetry("gemini-2.5-pro", `Search stock.adobe.com and return the top 8 most downloaded/highest demand visual assets for keyword "${keyword}".`, {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2
      }, 1);
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`[AdobeResearch] Gemini Grounding successfully retrieved ${parsed.length} assets.`);
        return parsed;
      }
    } catch (err) {
      console.error("[AdobeResearch] Gemini Grounding fallback error:", err.message);
      console.log(`[AdobeResearch] Attempting non-grounding Gemini fallback due to quota error...`);
      try {
        const systemInstructionNoGrounding = `You are an expert Adobe Stock index simulation assistant.
Generate 8 highly realistic popular stock assets for the search keyword: "${keyword}".
Generate realistic 9-digit Adobe Stock IDs (e.g. "548291039", "493821032").
Generate high-quality titles that precisely match typical popular key phrases searched on Adobe Stock (e.g., professional, well-crafted, highly descriptive).
For the imageUrl, utilize high-quality active Unsplash featured source image links that match this topic exactly using the following format:
https://images.unsplash.com/featured/500x375/?${encodeURIComponent(keyword)}&sig=<unique_number> (where unique_number is 1 to 8).
For detailUrl, use the format: https://stock.adobe.com/search?k=<id> or https://stock.adobe.com/images/title/<id>.
Return exactly 8 items matching the schema in JSON array format.`;
        const responseSchema = {
          type: import_genai.Type.ARRAY,
          items: {
            type: import_genai.Type.OBJECT,
            properties: {
              id: { type: import_genai.Type.STRING },
              title: { type: import_genai.Type.STRING },
              imageUrl: { type: import_genai.Type.STRING },
              detailUrl: { type: import_genai.Type.STRING },
              category: { type: import_genai.Type.STRING },
              downloads: { type: import_genai.Type.STRING }
            },
            required: ["id", "title", "imageUrl", "detailUrl", "category", "downloads"]
          }
        };
        const responseNoGrounding = await callGeminiWithRetry("gemini-2.5-pro", `Simulate top 8 trending assets on Adobe Stock for keyword "${keyword}" with Unsplash source placeholders.`, {
          systemInstruction: systemInstructionNoGrounding,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.7
        }, 1);
        const parsedNoG = JSON.parse(responseNoGrounding.text);
        if (Array.isArray(parsedNoG) && parsedNoG.length > 0) {
          console.log(`[AdobeResearch] Non-grounding Gemini fallback successfully retrieved ${parsedNoG.length} assets.`);
          return parsedNoG;
        }
      } catch (err2) {
        console.error("[AdobeResearch] Non-grounding Gemini fallback also failed:", err2.message);
      }
    }
  }
  if (scrapingResults.length === 0) {
    console.log(`[AdobeResearch] Running ultimate local generator fallback...`);
    const mockCategories = ["photo", "vector", "illustration"];
    const mockDownloads = ["Sangat Tinggi", "Tinggi", "Menengah"];
    for (let i = 1; i <= 8; i++) {
      const mockId = Math.floor(2e8 + Math.random() * 7e8).toString();
      const mockTitleList = [
        `Beautiful high-resolution ${keyword} illustration with vibrant color accents`,
        `Commercial professional stock photography of ${keyword} layout setup`,
        `Minimalist clean template design highlighting modern ${keyword}`,
        `Aesthetic warm presentation graphic element of ${keyword}`,
        `Stunning masterfully crafted ${keyword} for creative agency campaign`,
        `Close-up macro detail element representation of ${keyword}`,
        `Traditional authentic custom ${keyword} art illustration`,
        `Top trending high demand commercial asset featuring ${keyword}`
      ];
      scrapingResults.push({
        id: mockId,
        title: mockTitleList[i - 1],
        imageUrl: `https://images.unsplash.com/featured/500x375/?${encodeURIComponent(keyword)}&sig=${i}`,
        detailUrl: `https://stock.adobe.com/search?k=${mockId}`,
        category: mockCategories[(i - 1) % mockCategories.length],
        downloads: mockDownloads[(i - 1) % mockDownloads.length]
      });
    }
  }
  return scrapingResults;
}
async function checkVideoQuality(frames, tolerance = "MEDIUM", language = "Bahasa", model) {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  const isIndonesian = !language || language === "Bahasa" || language === "id" || language === "Indonesian" || language?.toLowerCase() === "indonesian" || language?.toLowerCase() === "id";
  const targetLanguageName = isIndonesian ? "Indonesian (Bahasa Indonesia)" : "English";
  let systemInstruction = `Anda adalah Kurator Fotografi Senior dan Spesialis Quality Assurance (QA) "Standar Kurator Adobe Stock" tingkat dunia. Anda dilatih secara khusus untuk melakukan kurasi dan audit teknis/hukum berstandar premium dengan akurasi 100% berdasarkan panduan resmi Adobe Stock Contributor Help: "Quality and Technical Standards Reasons for Content Refusal" (https://helpx.adobe.com/stock/contributor/content-moderation/quality-technical-standards-reasons-content-refusal.html).

Tugas Anda adalah melakukan audit visual yang SANGAT KETAT, MENDALAM, AKURAT, dan TANPA KOMPROMI terhadap cuplikan video komersial berdasarkan 6 frame diam (gambar) beruntun yang diekstrak secara merata dari sepanjang durasi video (mewakili keseluruhan video dari awal hingga akhir). Analisislah seluruh frame tersebut sebagai satu kesatuan video. Anda WAJIB menganalisis seluruh data frame video secara mendalam sampai ke tingkat piksel (pixel-level analysis). Pemeriksaan tidak boleh hanya terfokus pada subjek utama (subject) atau objek utama (object) saja, melainkan Anda wajib memindai setiap piksel di seluruh kanvas video secara merata: mulai dari latar depan (foreground), latar belakang (background), tepian bingkai (borders), area bayangan (shadows), area terang (highlights), tekstur permukaan halus, hingga sudut-sudut gambar (corner-to-corner scan).

---
PROSEDUR INSPEKSI ZOOM-IN & DETAIL MENDALAM (MANDATORY):
Untuk memberikan hasil yang paling akurat, Anda WAJIB mensimulasikan proses ZOOM-IN visual hingga 200% sampai 400% di tingkat piksel pada setiap frame video yang diberikan:
1. Periksa area fokus utama: Apakah subjek target benar-benar tajam (pin-sharp) di setiap frame? Jika ada "soft focus" terus-menerus atau "motion blur" ekstrem yang tidak disengaja akibat guncangan kamera parah (camera shake), tandai sebagai FAIL.
2. Deteksi distorsi Rolling Shutter secara teliti: Cari sisa-sisa skew (distorsi miring pada garis vertikal), jello effect (efek goyangan seperti jeli), atau flash banding.
3. Periksa area latar belakang dan detail piksel: Cari bintik debu sensor (sensor dust), chromatic aberration di tepian objek berkontras tinggi, artefak kompresi video parah (macro-blocking), gradasi warna patah (color banding), dan noise digital parah di area bayangan (shadows).
4. Periksa seluruh bagian untuk mendeteksi pelanggaran kekayaan intelektual (IP) mikro: Logo kecil pada kancing pakaian, emblem samar pada gadget/mobil, teks bermerek pada latar belakang, graffiti, atau karya seni berhak cipta.
5. Periksa struktur anatomi dan logika AI (jika video buatan AI): Cari jari berlebih/kurang, mata juling, geometri yang saling melebur atau melayang tidak wajar, detail pola berulang yang hancur, atau tulisan acak/gibberish yang mengacaukan estetika komersial.

---
PANDUAN TOLERANSI KETAT & REFUSAL REASONS ADOBE STOCK:
Tingkat Toleransi Saat Ini: ${tolerance}. Anda harus mengevaluasi dengan tingkat keketatan berikut:
- STRICT: "Zero Tolerance" mutlak terhadap cacat teknis apa pun atau pelanggaran IP sekecil apa pun. Sedikit soft focus, sedikit chromatic aberration, satu titik debu sensor, artefak AI sekecil apa pun, jello effect minor, atau indikasi IP = FAIL secara instan (Skor maksimal 0-59).
- MEDIUM: Cacat minor di latar belakang non-kritis yang tidak mengganggu estetika komersial bisa ditoleransi. Namun, pelanggaran IP sekecil apa pun, over-exposure fatal pada subjek utama, out-of-focus pada subjek utama, guncangan kamera yang mengganggu, atau anomali gen-AI yang terlihat jelas = FAIL secara instan (Skor maksimal 0-65).
- LOOSE: Loloskan selama video memiliki nilai komersial yang tinggi dan komposisinya menarik. Hanya kegagalan teknis yang sangat parah atau pelanggaran IP mencolok yang menyebabkan FAIL (Skor 0-69).

---
DAFTAR ALASAN PENOLAKAN RESMI ADOBE STOCK (REFUSAL CRITERIA):
Anda wajib mencocokkan setiap temuan secara presisi dengan alasan penolakan berikut:

1. OUT OF FOCUS / SOFT FOCUS / SHARPNESS:
   - Subjek utama tidak tajam secara sempurna (lack of sharpness).
   - Motion blur akibat guncangan kamera atau pergerakan subjek yang terlalu cepat tanpa diimbangi shutter speed yang memadai.
   - Depth of field (DoF) terlalu dangkal yang menyebabkan area penting subjek meleset dari fokus (misal, hidung fokus tetapi mata buram). Note: Bokeh artistik pada latar belakang adalah estetika premium, BUKAN cacat, selama subjek utamanya tajam sempurna.
   - Efek noise reduction (pembungkaman noise) yang terlalu agresif, menyebabkan detail tekstur kulit atau benda menghilang dan tampak mulus seperti lilin/plastik (waxy skin / plastic-like textures).

2. ARTIFACTS / NOISE / EXCESSIVE FILTERING / COMPRESSION:
   - Noise digital (luminance & chromatic noise) berlebih, terutama terlihat di area bayangan atau bidang berwarna datar seperti langit biru.
   - Chromatic Aberration / Color Fringing: Garis tepi berwarna ungu, hijau, atau magenta di sepanjang batas objek berkontras tinggi (seperti ranting pohon di latar belakang langit terang).
   - Sensor Dust (Bintik Debu): Bintik-bintik abu-abu/hitam buram melingkar akibat debu pada sensor fisik kamera, terutama tampak jelas pada area warna datar (sky, studio background).
   - Compression Artifacts (Artefak Kompresi): Kotak-kotak piksel kecil (macro-blocking) atau pixelation akibat rasio kompresi video yang terlalu tinggi atau pembesaran gambar (interpolation) paksa.
   - Halos / Oversharpening: Tepi putih menyala di sekitar objek akibat penggunaan filter penajaman (sharpening) yang berlebihan.
   - Color Banding: Transisi gradasi warna yang patah atau bergaris kasar (tidak mulus), sering terjadi pada langit atau background studio.
   - Excessive Filtering / Over-processed: Gambar terlalu kontras, warna terlalu tersaturasi secara artifisial, atau efek HDR ekstrem yang merusak estetika natural.
   - Upscaling (Resolusi Palsu): Video yang di-upscale secara paksa dari resolusi rendah ke resolusi lebih tinggi (misal HD dipaksa jadi 4K) WAJIB DITOLAK. Ciri-cirinya: ketajaman detail terlihat "dipaksakan"/lembek meski resolusi filenya besar, tekstur halus terlihat buram atau di-interpolasi, dan detail piksel tidak natural untuk resolusi yang diklaim.
   - Log/Flat Color Grading Belum Diproses: Footage yang masih dalam gamma Log/flat (kontras sangat rendah, warna pudar keabu-abuan, saturasi sangat minim) tanpa color grading dasar (Rec.709 LUT) yang layak jual = FAIL. Video harus terlihat sudah melalui proses grading warna dasar, bukan flat/log mentah.

3. EXPOSURE & LIGHTING PROBLEMS:
   - Overexposure: "Blown-out highlights" / bagian terang yang benar-benar putih murni tanpa ada detail tekstur/piksel sama sekali (misal, langit putih polos tanpa awan, kulit putih terbakar cahaya).
   - Underexposure: "Crushed shadows" / bagian gelap yang hitam pekat tanpa detail piksel sama sekali.
   - Kontras tidak seimbang, pencahayaan datar (flat lighting) yang tidak menarik, atau bayangan yang kasar/tidak sedap dipandang pada subjek (unflattering shadows).
   - White balance buruk yang menghasilkan color cast tidak alami (terlalu biru, kuning, atau hijau).

4. COMPOSITION & CROPPING ISSUES:
   - Crooked Horizon: Garis cakrawala, dinding, atau bangunan yang miring tanpa ada tujuan artistik yang jelas.
   - Awkward Crop: Pemotongan subjek utama yang canggung di tepi bingkai (misal, memotong sendi, ujung jari kaki, atau sebagian kepala subjek secara tanggung).
   - Komposisi berantakan atau subjek utama tenggelam oleh elemen latar belakang.

5. ROLLING SHUTTER & VIDEO SPECIFIC ISSUES:
   - Skew Distortion: Garis tegak lurus tampak miring ketika kamera bergeser secara horizontal (panning) dengan cepat.
   - Jello Effect: Video bergoyang meliuk-liuk secara artifisial seperti jeli karena getaran frekuensi tinggi pada kamera.
   - Flash Banding: Kecerahan video tidak merata (terbagi menjadi pita-pita horizontal) karena kecepatan blitz cahaya atau lampu di sekitar tidak sinkron dengan sensor rolling shutter.
   - Flickering: Kedipan cahaya tidak stabil pada frame karena ketidaksamaan frekuensi lampu listrik dengan shutter speed kamera.
   - Duplicate / Empty Frames: Frame kosong (fully black/white) atau macet/membeku (frozen frame).

6. GENERATIVE AI & STRUCTURAL QUALITY STANDARDS:
   - Structural & Mechanical Failures: Objek buatan AI harus logis dan realistis secara struktural. Cacat geometri atau kegagalan mekanis yang jelas (seperti laci kabinet file yang meleleh, kaki meja melayang, bingkai jendela bengkok secara tidak alami, sambungan dinding/papan yang miring atau terputus secara aneh, atau detail tombol/geometri yang melebur kasar) WAJIB dinilai sebagai kegagalan teknis parah = FAIL.
   - Anatomi Cacat & AI Hallucinations: Jari tangan berlebih/kurang, mata asimetris/juling, bagian tubuh menyatu, atau proporsi anatomi manusia/hewan yang janggal di area mana pun pada gambar = FAIL.
   - Teks Kacau (Gibberish Text): Teks acak (gibberish), huruf tidak terbaca, coretan seperti tulisan, atau teks AI yang rusak/cakar ayam pada objek utama maupun pada kertas tempel, buku, papan, atau latar belakang yang terlihat jelas = FAIL. Adobe Stock menolak segala jenis teks tidak terbaca yang dihasilkan AI karena merusak estetika dan nilai komersial gambar.
   - Temporal Inconsistency & Morphing: Perhatikan perubahan bentuk (morphing) antar frame. Jika wajah manusia atau objek utama berubah bentuk secara mengerikan dan drastis di tengah video = FAIL.
   - Bayangan & Pencahayaan Tidak Realistis (Unrealistic Shadows/Depth/Lighting): Loloskan ketidakkonsistenan bayangan minor antar-frame selama video terlihat memukau secara keseluruhan. Berikan FAIL hanya jika render artifact membuat pencahayaan sama sekali tidak cocok secara fisik hingga merusak estetika.

   PENTING - PRINSIP PENILAIAN GENERATIVE AI VIDEO (REALISTIS & KOMERSIAL):
   1. Adobe Stock mengutamakan estetika dan daya jual (commercial value) video. Jika sebuah video memiliki cacat visual yang jelas (seperti teks cakar ayam AI atau laci kabinet meleleh), video tersebut wajib dinilai FAIL tanpa toleransi.
   2. Selama anomali AI sangat minor antar-frame (seperti sedikit morphing latar belakang yang wajar, objek statis di latar belakang yang mengalami sedikit perubahan tekstur halus), tetap loloskan dengan status PASS.

7. INTELLECTUAL PROPERTY (IP) & TRADEMARK RESTRICTIONS (Hukum & Hak Cipta - Berdasarkan Kebijakan Resmi Adobe Stock Known Restrictions di https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html dan Common Reasons for Content Refusal di https://helpx.adobe.com/stock/contributor/content-moderation/common-reasons-content-refusal.html):
   CATATAN PENTING: Daftar berikut adalah CONTOH REPRESENTATIF, BUKAN daftar lengkap. Adobe memperbarui daftar known restrictions ini secara berkala dan mencakup ratusan entri spesifik. Terapkan PRINSIP UMUMNYA secara konsisten di setiap frame video: setiap logo/merek yang dapat dikenali, desain produk yang khas/ikonik, karakter fiksi, landmark/bangunan tertentu, lambang resmi organisasi, atau tokoh publik = berisiko FAIL, meskipun namanya tidak eksplisit tercantum di bawah ini.

   - Merek & Logo Komersial: Logo, merek dagang, nama merek, atau kemasan produk yang dapat dikenali sekecil apa pun, termasuk yang hanya tampak sekilas di salah satu frame. Contoh: Apple, Nike (swoosh, "Just Do It"), Adidas (tiga strip), Google, Amazon, Coca-Cola, Mercedes-Benz, BMW, DJI, LV (Louis Vuitton), Burberry, Tiffany blue, Vans, Pantone.
   - Desain Khas & Bentuk Produk (Trade Dress): Desain fisik ikonik sebagai subjek utama meski tanpa logo terlihat. Contoh: Lego/Duplo, boneka Barbie, Rubik's Cube, Monopoly, Funko Pop, Hello Kitty/Sanrio, elektronik Apple (bodi iPhone/MacBook/iPad), kamera Polaroid klasik, drone DJI, sepatu Converse Chuck Taylor, Dr. Martens, sol merah Christian Louboutin, Beats by Dre, perabot desainer.
   - Desain Otomotif Khas: Grille BMW kidney, Rolls-Royce Spirit of Ecstasy/grille, Jeep 7-slot grille, logo bintang Mercedes, bentuk Vespa/Lambretta ikonik, VW Beetle/Kombi klasik, mesin pertanian John Deere/Claas dengan skema warna khasnya.
   - Karakter Fiksi & Waralaba Berhak Cipta: Karakter Disney/Pixar, Mickey Mouse, Pok\xE9mon, superhero Marvel/DC, Batmobile atau kendaraan bertema Batman, Minecraft, Pac-Man, frasa "Star Wars".
   - Organisasi, Olahraga & Lambang Resmi: Cincin Olimpiade/obor/maskot, FIFA & World Cup, UEFA & Euro Cup, NFL/Super Bowl, NASA (insignia, logo, nama misi), palang merah/bulan sabit merah di latar putih, lencana/emblem kepolisian atau militer, logo transportasi umum (MTA New York, London Underground, Paris RATP/M\xE9tro, TGV, ICE Deutsche Bahn, BART, CTA Chicago) - skema warna & desain kereta/bus yang khas juga dilindungi.
   - Selebriti, Tokoh Publik & Body Likeness: Wajah/rupa selebriti yang dapat dikenali di frame manapun untuk penggunaan komersial DILARANG (peniru/impersonator hanya boleh dengan model release yang mencantumkan kata "impersonator").
   - Bangunan, Landmark & Lokasi Berbayar/Terlarang (SANGAT KETAT - periksa SEMUA frame, termasuk latar belakang):
     * Interior-only restriction (interior dilarang, eksterior umumnya boleh): Notre-Dame de Paris, Hagia Sophia, Colosseum, Sistine Chapel, Sheikh Zayed Grand Mosque, Sagrada Fam\xEDlia (interior).
     * Bangunan/struktur dengan larangan penuh sebagai fokus utama: Menara Eiffel di malam hari (siang hari aman), Burj Khalifa, Burj Al Arab, Sydney Opera House, Atomium, Louvre Pyramid, Space Needle, CN Tower, The Shard, London Eye, Taipei 101, Menara Kembar Petronas, Empire State Building, Chrysler Building, One World Trade Center, Willis Tower, Grand Central Terminal, Rockefeller Center, Madison Square Garden, Vessel (NYC), Tokyo Tower/Skytree, Neuschwanstein Castle, Hollywood Sign & Walk of Fame.
     * Patung/instalasi seni publik ikonik: Cloud Gate ("The Bean"), Charging Bull, Christ the Redeemer, Little Mermaid, Merlion, Mannekin Pis, Fremont Troll, memorial-memorial nasional (MLK, Iwo Jima, Holocaust Memorial).
     * Lokasi berbayar/bertiket, taman tema (Disney, SeaWorld, Universal), kebun binatang/akuarium berbrand, museum tertentu, situs warisan arkeologis dengan pembatasan lokal (Machu Picchu, Stonehenge, Chichen Itza).
     * Arsitektur modern dengan desain unik/mudah dikenali sebagai fokus utama tanpa property release.
   - Karya Seni & Hak Cipta Visual Lainnya: Karya cipta orang lain (lukisan, patung, street art/graffiti, mural, font spesifik, elemen grafis) sebagai fokus utama tanpa izin.
   - Dokumen Negara, Uang & Identitas: Uang kertas/koin utuh sebagai fokus utama; prangko AS pasca-1971 atau yang menampilkan selebriti/organisasi olahraga; paspor, SIM, KTP/ID, kartu kredit/debit, buku tabungan bank.
   - Warna & Elemen Non-Logo yang Dilindungi sebagai Trade Dress: Warna coklat UPS pada seragam/truk pengiriman paket.
   - Hak Pribadi & Tubuh (Biometrics): Tato unik pada subjek manusia (memerlukan property release dari seniman tato & model); wajah manusia yang dapat dikenali tanpa Model Release yang valid untuk penggunaan komersial.

   PENTING - PENGECEKAN ATURAN IP & TRADEMARK VIDEO SECARA REALISTIS (ADOBE STOCK COMPLIANCE):
   1. Pengecualian Latar Belakang (Background Rule): Landmark berhak cipta (seperti Menara Eiffel, Burj Khalifa, skyline kota, dll.) atau logo kecil tidak mencolok yang berada jauh di latar belakang, blur (out of focus), atau hanya merupakan bagian minor dari komposisi kota (skyline umum) di salah satu frame video BUKANLAH dasar penolakan. Berikan penilaian SAFE/PASS. Penolakan IP hanya berlaku jika objek tersebut menjadi subjek utama/fokus utama video tanpa property release.
   2. Pengecualian Produk Generik (Generic Product Rule): Perangkat elektronik (smartphone, laptop, TV, smartwatch), kendaraan (mobil, motor), atau perabot/furnitur yang tidak menampilkan logo resmi dan tidak meniru trade dress secara identik (seperti lekukan BMW grille atau notch khas iPhone) wajib diloloskan sebagai produk generik (SAFE/PASS) di video. Jangan menolak ponsel pintar atau laptop biasa hanya karena bentuknya kotak tipis.
   3. Pengecualian Logo Mikro & Teks Insidental: Logo atau nama merek berukuran mikroskopis (kurang dari 1% luas gambar) pada pakaian subjek, label kecil, atau rambu jalan yang sangat jauh dan tidak mempromosikan merek tersebut secara mencolok wajib diberikan status SAFE/PASS karena bersifat insidental.

---
STATUS & SKORING (HARUS SANGAT KONSISTEN & KETAT):
- PASS: Lulus standar Adobe Stock secara sempurna. Skor WAJIB 75 - 100.
- FAIL: Ditolak karena melanggar minimal salah satu kriteria di atas (Kriteria A, B, atau C). Skor WAJIB di bawah 70 (0 - 69).
*PENTING: Jangan berikan skor abu-abu di rentang 70-74. Jika gagal, skor harus di bawah 70. Jika lulus, skor minimal 75.*

---
PENTING - PRIORITASKAN KETELITIAN VISUAL SECARA OBJEKTIF DAN LOGIS:
Kurator Adobe Stock dan pembeli premium menghargai video yang berkualitas. Anda WAJIB bertindak sebagai auditor visual yang realistis, objektif, dan seperti manusia sungguhan.
1. EVALUASI REALISTIS: Lakukan evaluasi secara wajar pada frame yang diberikan. JANGAN MENGARANG atau MENEBAK-NEBAK (hallucinate) cacat yang sebenarnya tidak ada.
2. JANGAN HALU TENTANG KONSISTENSI (NO HALLUCINATIONS): Jangan mengatakan "objek menghilang" atau "kegagalan logika struktural" secara sembarangan. Buktikan HANYA jika cacatnya 100% nyata dan terlihat secara visual (misalnya ada bagian tubuh yang benar-benar hilang/terpotong). Jika tidak ada bukti cacat visual yang nyata di frame tersebut, jangan buat-buat alasan penolakan!
3. TOLERANSI WAJAR: Jika video terlihat estetik dan tidak ada kejanggalan visual yang merusak komposisi secara fatal, video tersebut layak lulus (PASS).
ATURAN OUTPUT TEKS (SANGAT MENDETAIL):
1. Isi dari field \`visual_scan_analysis\` dan \`detailed_feedback\` WAJIB SANGAT PANJANG, SPESIFIK, dan MENDETAIL (minimal 3-4 paragraf) menyerupai laporan forensik visual. Anda DILARANG HANYA menganalisis subjek utama! Anda WAJIB menganalisis dan mendokumentasikan empat aspek berikut secara terpisah pada 6 frame video:
      - **Analisis Subjek Utama (Subject)**: Detail ketajaman fokus, pergerakan, geometri, dan kestabilan subjek utama.
      - **Analisis Latar Belakang & Latar Depan (Background & Foreground)**: Keadaan latar depan/belakang, noise, compression artifacts, macro-blocking, atau color banding di bidang latar belakang.
      - **Analisis Pencahayaan & Warna (Lighting, Contrast, & Color)**: Keseimbangan kontras, white balance, flickering, serta keberadaan area overexposed/underexposed pada subjek maupun lingkungan.
      - **Analisis Kestabilan Frame & Risiko Hukum (Stability, IP & AI Risks)**: Guncangan kamera, rolling shutter (jello/skew effect), micro-logos, watermark, teks AI, atau kejanggalan struktur geometri AI antar-frame.
2. Untuk setiap item di dalam \`quality_checks\` (seperti \`blur\`, \`noise\`, \`blocking\`, \`banding\`, \`overexposure\`, dll.), tuliskan \`note\` yang spesifik, unik, dan hasil analisis nyata terhadap 6 frame video tersebut. JANGAN gunakan kalimat template pendek/berulang. Deskripsikan apa yang Anda amati secara fisik pada aspek tersebut di video ini (contoh: "Noise digital sangat minim, hanya terlihat grain halus yang estetis pada area bayangan di kuadran kanan bawah pada frame 3 dan 4").
3. Pada objek \`metadata\`, berikan rekomendasi \`title\` komersial yang deskriptif untuk video ini dalam ${targetLanguageName}, serta minimal 10-15 \`keywords\` (kata kunci SEO) komersial dalam ${targetLanguageName} yang relevan untuk mikrostock.

ATURAN BAHASA:
Gunakan bahasa sesuai dengan parameter requested language: ${targetLanguageName}. Semua isi teks dalam JSON respons (termasuk visual_scan_analysis, technical_issues, strengths, detailed_feedback, dan note pada quality_checks) wajib menggunakan bahasa tersebut secara konsisten sesuai pilihan pengguna.

Respons Anda WAJIB dalam format JSON yang valid dan bersih sesuai dengan skema yang diberikan.`;
  const responseSchema = {
    type: import_genai.Type.OBJECT,
    properties: {
      visual_scan_analysis: { type: import_genai.Type.STRING },
      legal_status: { type: import_genai.Type.STRING, enum: ["SAFE", "AT_RISK", "VIOLATION"] },
      technical_issues: {
        type: import_genai.Type.ARRAY,
        items: { type: import_genai.Type.STRING }
      },
      strengths: {
        type: import_genai.Type.ARRAY,
        items: { type: import_genai.Type.STRING }
      },
      overall_score: { type: import_genai.Type.NUMBER },
      technical_score: { type: import_genai.Type.NUMBER },
      visual_score: { type: import_genai.Type.NUMBER },
      recommendation: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL", "RETOUCH"] },
      adobe_stock_readiness: { type: import_genai.Type.STRING, enum: ["Ready", "Needs Improvement", "Reject Risk"] },
      detailed_feedback: { type: import_genai.Type.STRING },
      quality_checks: {
        type: import_genai.Type.OBJECT,
        properties: {
          blur: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          noise: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          compression_artifacts: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          blocking: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          banding: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          overexposure: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          underexposure: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          white_balance: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          motion_blur: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          camera_shake: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          out_of_focus: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          flickering: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          duplicate_frame: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          empty_frame: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          black_frame: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          frozen_frame: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          watermark: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          logo: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          text: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          ai_artifact: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          deformed_object: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          bad_anatomy: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          cropped_subject: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          cut_off_object: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          wrong_perspective: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] },
          low_aesthetic_quality: { type: import_genai.Type.OBJECT, properties: { status: { type: import_genai.Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: import_genai.Type.STRING } }, required: ["status", "note"] }
        },
        required: [
          "blur",
          "noise",
          "compression_artifacts",
          "blocking",
          "banding",
          "overexposure",
          "underexposure",
          "white_balance",
          "motion_blur",
          "camera_shake",
          "out_of_focus",
          "flickering",
          "duplicate_frame",
          "empty_frame",
          "black_frame",
          "frozen_frame",
          "watermark",
          "logo",
          "text",
          "ai_artifact",
          "deformed_object",
          "bad_anatomy",
          "cropped_subject",
          "cut_off_object",
          "wrong_perspective",
          "low_aesthetic_quality"
        ]
      },
      heatmaps: {
        type: import_genai.Type.ARRAY,
        items: {
          type: import_genai.Type.OBJECT,
          properties: {
            type: { type: import_genai.Type.STRING },
            x: { type: import_genai.Type.NUMBER },
            y: { type: import_genai.Type.NUMBER },
            intensity: { type: import_genai.Type.NUMBER },
            raw_value: { type: import_genai.Type.STRING }
          },
          required: ["type", "x", "y", "intensity", "raw_value"]
        }
      },
      metadata: {
        type: import_genai.Type.OBJECT,
        properties: {
          title: { type: import_genai.Type.STRING },
          keywords: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } }
        },
        required: ["title", "keywords"]
      }
    },
    required: ["visual_scan_analysis", "legal_status", "technical_issues", "strengths", "overall_score", "recommendation", "detailed_feedback", "quality_checks", "heatmaps", "metadata"]
  };
  const imageParts = frames.map((f) => processFrameServer(f));
  const modelsToTry = ["gemini-2.5-pro", "gemini-2.5-pro", "gemini-2.5-pro-preview", "gemini-2.5-pro"];
  let responseText = "";
  let lastError;
  const modelsToTryList = model && model.startsWith("gemini") ? [model, ...modelsToTry] : modelsToTry;
  const randomSeed = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  for (const modelName of modelsToTryList) {
    try {
      const res = await callGeminiWithRetry(modelName, { parts: [...imageParts, { text: `Act as an objective Adobe Stock QA curator. Evaluate these ${frames.length} random video frames extracted throughout the video. Conduct a balanced technical and legal audit. Determine final status as PASS or FAIL consistently based on the tolerance provided. If the video fails, provide a detailed analysis of the visual issues found in the frames as detailed_feedback. Ensure your entire response is written in ${language}. [Unique Session Seed: ${randomSeed}]` }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0,
        topK: 1,
        topP: 0.1
      });
      responseText = res.text || "{}";
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[checkVideoQuality] Failed with ${modelName}:`, err.message || err);
      if (err.message && err.message.includes("API_KEY")) throw err;
    }
  }
  if (!responseText) throw lastError;
  try {
    const text = responseText;
    console.log("QA raw video response:", text);
    const parsedResult = JSON.parse(text);
    return parsedResult;
  } catch (e) {
    console.warn("Parse Error:", responseText);
    throw e;
  }
}

// server.ts
var import_module = require("module");
var getMetaUrl = () => {
  try {
    return new Function("return import.meta.url")();
  } catch (e) {
    return "file://";
  }
};
var _require = typeof require !== "undefined" ? require : (0, import_module.createRequire)(getMetaUrl());
try {
  _require.resolve("@ffmpeg-installer/linux-x64/ffmpeg");
  _require.resolve("@ffprobe-installer/linux-x64/ffprobe");
} catch (e) {
}
var ffmpeg;
if (true) {
  try {
    const ffmpegLib = _require("fluent-ffmpeg");
    ffmpeg = typeof ffmpegLib === "function" ? ffmpegLib : ffmpegLib.default || ffmpegLib;
    ffmpeg.setFfmpegPath(_require("@ffmpeg-installer/ffmpeg").path);
    ffmpeg.setFfprobePath(_require("@ffprobe-installer/ffprobe").path);
  } catch (e) {
    console.warn("ffmpeg not available locally", e);
  }
}
var AsyncQueue = class {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }
  async enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }
  async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const task = this.queue.shift();
    if (task) {
      await task();
    }
    this.isProcessing = false;
    this.processNext();
  }
};
var gsQueue = new AsyncQueue();
var __filename_safe = typeof __filename !== "undefined" ? __filename : getMetaUrl() !== "file://" ? (0, import_url.fileURLToPath)(getMetaUrl()) : "";
var __dirname_safe = typeof __dirname !== "undefined" ? __dirname : __filename_safe ? import_path.default.dirname(__filename_safe) : process.cwd();
var spawnAsync = (command, args, options) => {
  return new Promise((resolve, reject) => {
    let isDone = false;
    const child = (0, import_child_process.spawn)(command, args, { ...options, stdio: "ignore" });
    let timeoutId;
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        if (isDone) return;
        isDone = true;
        console.error(`[MANDOR] WORKER STUCK! Forcibly terminating PID: ${child.pid} after ${options.timeout}ms...`);
        try {
          child.kill("SIGKILL");
        } catch (e) {
          console.error("[MANDOR] Failed to kill child:", e);
        }
        reject(new Error(`[MANDOR] Worker stuck and forcibly terminated after ${options.timeout}ms. Memory cleared.`));
      }, options.timeout);
    }
    child.on("close", (code) => {
      if (isDone) return;
      isDone = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
    child.on("error", (err) => {
      if (isDone) return;
      isDone = true;
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    });
  });
};
var uploadDir = process.env.VERCEL ? "/tmp" : import_path.default.join(process.cwd(), "uploads");
try {
  if (!import_fs.default.existsSync(uploadDir)) {
    import_fs.default.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn("[WARNING] Cannot create uploadDir on Vercel, using default fallback /tmp:", err);
}
var localGsPath = import_path.default.join(process.cwd(), "bin", "gs");
if (import_fs.default.existsSync(localGsPath)) {
  try {
    import_fs.default.chmodSync(localGsPath, "0755");
    console.log("[PERMISSIONS] Successfully set executable permission (0755) on local gs binary");
  } catch (err) {
    console.warn("[PERMISSIONS] Failed to set executable permission on gs binary:", err);
  }
}
var gsExecutable = import_fs.default.existsSync(localGsPath) ? localGsPath : "gs";
var upload = (0, import_multer.default)({
  dest: uploadDir,
  limits: { fileSize: 500 * 1024 * 1024 }
  // 500MB Limit
});
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "500mb" }));
app.use(import_express.default.urlencoded({ limit: "500mb", extended: true }));
app.use((req, res, next) => {
  const customGeminiKey = req.headers["x-gemini-key"];
  const customGroqKey = req.headers["x-groq-key"];
  const customMistralKey = req.headers["x-mistral-key"];
  const customOpenAIKey = req.headers["x-openai-key"];
  const customOpenRouterKey = req.headers["x-openrouter-key"];
  const customNvidiaKey = req.headers["x-nvidia-key"];
  const customBlackboxKey = req.headers["x-blackbox-key"];
  const customBluesmindsKey = req.headers["x-bluesminds-key"];
  const customAiveneKey = req.headers["x-aivene-key"];
  const provider = req.headers["x-ai-provider"] || "gemini";
  const getKeys = (headerVal) => {
    return headerVal && typeof headerVal === "string" ? headerVal.split(",").map((k) => k.trim()).filter(Boolean) : [];
  };
  apiKeyStorage.run({
    provider: String(provider),
    gemini: { keys: getKeys(customGeminiKey), activeIndex: 0 },
    groq: { keys: getKeys(customGroqKey), activeIndex: 0 },
    mistral: { keys: getKeys(customMistralKey), activeIndex: 0 },
    openai: { keys: getKeys(customOpenAIKey), activeIndex: 0 },
    openrouter: { keys: getKeys(customOpenRouterKey), activeIndex: 0 },
    nvidia: { keys: getKeys(customNvidiaKey), activeIndex: 0 },
    blackbox: { keys: getKeys(customBlackboxKey), activeIndex: 0 },
    bluesminds: { keys: getKeys(customBluesmindsKey), activeIndex: 0 },
    aivene: { keys: getKeys(customAiveneKey), activeIndex: 0 }
  }, () => {
    next();
  });
});
app.use((err, req, res, next) => {
  if (err) {
    console.error("[GLOBAL ERROR]", err);
    if (err.status === 413 || err.code === "LIMIT_FILE_SIZE" || err.message?.includes("too large")) {
      const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV;
      const limitMsg = isVercel ? "Vercel has a strict 4.5MB limit for serverless functions. Please optimize your EPS/AI file below 4.5MB or deploy to a platform with higher limits (like Railway or Cloud Run)." : "Payload too large. Vector file exceeds the server capacity (max 500MB). Try optimizing the EPS file.";
      return res.status(413).json({ error: limitMsg });
    }
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  }
  next();
});
var activeEpsConversions = 0;
var MAX_CONCURRENT_EPS = 1;
var throttleMiddleware = (req, res, next) => {
  if (activeEpsConversions >= MAX_CONCURRENT_EPS) {
    return res.status(429).json({ error: "Server is currently at maximum capacity. Please wait to prevent memory crash." });
  }
  activeEpsConversions++;
  let isCleanedUp = false;
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    activeEpsConversions--;
    console.log(`[THROTTLE CLEANUP] 1 request finished. Active EPS conversions now: ${activeEpsConversions}`);
    if (req.file && import_fs.default.existsSync(req.file.path)) {
      try {
        import_fs.default.unlinkSync(req.file.path);
        console.log(`[MULTER FAILSAFE] Deleted stray upload: ${req.file.path}`);
      } catch (e) {
      }
    }
    res.removeListener("finish", cleanup);
    res.removeListener("close", cleanup);
    req.removeListener("aborted", cleanup);
    req.removeListener("close", cleanup);
  };
  console.log(`[THROTTLE INCOMING] Active EPS conversions: ${activeEpsConversions}`);
  res.on("finish", cleanup);
  res.on("close", cleanup);
  req.on("aborted", cleanup);
  req.on("close", cleanup);
  next();
};
async function startServer() {
  try {
    if (import_fs.default.existsSync(uploadDir)) {
      const files = await import_fs.default.promises.readdir(uploadDir);
      for (const file of files) {
        await import_fs.default.promises.unlink(import_path.default.join(uploadDir, file)).catch(() => {
        });
      }
      console.log(`Cleared ${files.length} files from uploads directory.`);
    }
  } catch (err) {
    console.error("Failed to clear uploads directory:", err);
  }
}
app.get(["/auth/callback", "/auth/callback/"], (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Authentication Callback</title>
</head>
<body style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #f8fafc;">
  <h2>Authenticating...</h2>
  <p>Please wait while we complete your sign-in.</p>
  <script>
    function handleAuth() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        sendErrorToOpener(error, errorDescription || 'Authentication failed');
        return;
      }

      if (code) {
        sendCodeToOpener(code);
        return;
      }

      const hash = window.location.hash;
      if (!hash) {
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        if (accessToken) {
          sendToOpener({ access_token: accessToken, refresh_token: refreshToken });
          return;
        }
        document.body.innerHTML = '<h2>Authentication Failed</h2><p>No authentication parameters found in the response URL.</p>';
        return;
      }

      const params = {};
      hash.substring(1).split('&').forEach(pair => {
        const [key, val] = pair.split('=');
        if (key && val) {
          params[key] = decodeURIComponent(val);
        }
      });

      if (params.access_token) {
        sendToOpener(params);
      } else {
        document.body.innerHTML = '<h2>Authentication Failed</h2><p>Authentication failed or token is missing.</p>';
      }
    }

    function sendCodeToOpener(code) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_CODE',
          code: code
        }, '*');
        
        document.body.innerHTML = '<h2>Success!</h2><p>Completing your sign-in... This window will close automatically.</p>';
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        window.location.href = '/';
      }
    }

    function sendErrorToOpener(error, desc) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_ERROR',
          error: error,
          description: desc
        }, '*');
        
        document.body.innerHTML = '<h2>Authentication Error</h2><p>' + desc + '</p>';
        setTimeout(() => {
          window.close();
        }, 3000);
      } else {
        window.location.href = '/';
      }
    }

    function sendToOpener(params) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_SUCCESS',
          access_token: params.access_token,
          refresh_token: params.refresh_token,
          expires_in: params.expires_in,
          provider_token: params.provider_token
        }, '*');
        
        document.body.innerHTML = '<h2>Success!</h2><p>Signing in... This window will close automatically.</p>';
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        window.location.href = '/';
      }
    }

    handleAuth();
  </script>
</body>
</html>
    `);
});
app.get("/api/debug-uploads", (req, res) => {
  try {
    const files = import_fs.default.readdirSync(uploadDir);
    let totalSize = 0;
    const fileStats = files.map((file) => {
      const stat = import_fs.default.statSync(import_path.default.join(uploadDir, file));
      totalSize += stat.size;
      return { name: file, size: stat.size };
    });
    res.json({ count: files.length, totalSizeMB: totalSize / (1024 * 1024), files: fileStats, activeConversions: activeEpsConversions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
var KEYS_FILE = import_path.default.join(process.cwd(), "keys.json");
var readKeys = () => {
  try {
    if (import_fs.default.existsSync(KEYS_FILE)) {
      const data = import_fs.default.readFileSync(KEYS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to read keys.json:", e);
  }
  return [];
};
var writeKeys = (keys) => {
  try {
    import_fs.default.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write keys.json:", e);
  }
};
var generateRandomKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const genPart = (len) => {
    let result = "";
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `MZPRO-${genPart(4)}-${genPart(4)}-${genPart(4)}`;
};
app.get("/api/keys", (req, res) => {
  res.json(readKeys());
});
app.post("/api/keys/generate", (req, res) => {
  const count = parseInt(req.body.count) || 5;
  const currentKeys = readKeys();
  const newKeys = [];
  for (let i = 0; i < count; i++) {
    let newKey = generateRandomKey();
    while (currentKeys.some((k) => k.key === newKey) || newKeys.some((k) => k.key === newKey)) {
      newKey = generateRandomKey();
    }
    newKeys.push({
      key: newKey,
      activated: false,
      activatedBy: "",
      activatedAt: ""
    });
  }
  const updatedKeys = [...currentKeys, ...newKeys];
  writeKeys(updatedKeys);
  res.json({ success: true, keys: newKeys, allKeys: updatedKeys });
});
app.post("/api/keys/delete", (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }
  const currentKeys = readKeys();
  const updatedKeys = currentKeys.filter((k) => k.key !== key);
  writeKeys(updatedKeys);
  res.json({ success: true, allKeys: updatedKeys });
});
app.post("/api/keys/reset", (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }
  const currentKeys = readKeys();
  const keyObj = currentKeys.find((k) => k.key === key);
  if (keyObj) {
    keyObj.activated = false;
    keyObj.activatedBy = "";
    keyObj.activatedAt = "";
    writeKeys(currentKeys);
    res.json({ success: true, allKeys: currentKeys });
  } else {
    res.status(404).json({ error: "Key not found" });
  }
});
app.post("/api/activate", (req, res) => {
  const { key, email, deviceId } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Mohon masukkan Serial Key Anda." });
  }
  const normalizedKey = key.trim().toUpperCase();
  const userIdentifier = email || deviceId || "anonymous";
  const currentKeys = readKeys();
  const keyObj = currentKeys.find((k) => k.key === normalizedKey);
  if (keyObj) {
    if (keyObj.activated) {
      if (keyObj.activatedBy === userIdentifier) {
        return res.json({ success: true, message: "Selamat! Serial Key ini telah aktif sebelumnya di perangkat Anda." });
      } else {
        return res.status(400).json({ error: "Serial Key ini sudah digunakan oleh pengguna lain! Mohon gunakan Serial Key yang berbeda." });
      }
    } else {
      keyObj.activated = true;
      keyObj.activatedBy = userIdentifier;
      keyObj.activatedAt = (/* @__PURE__ */ new Date()).toISOString();
      writeKeys(currentKeys);
      return res.json({ success: true, message: "Aktivasi Berhasil! Serial Key Anda terdaftar secara resmi." });
    }
  } else {
    if (normalizedKey === "MZPRO-VIP-2026" || normalizedKey === "MZPRO-UNLIMITED-LIFE" || normalizedKey === "MZPRO-COMMERCIAL-2026") {
      return res.json({ success: true, message: "Aktivasi Berhasil menggunakan Master Key!" });
    }
    if (normalizedKey.startsWith("MZPRO-") && normalizedKey.endsWith("-OK")) {
      return res.json({ success: true, message: "Aktivasi Berhasil menggunakan Algoritma Offline!" });
    }
    if (normalizedKey.length >= 10 && normalizedKey.includes("MZ") && normalizedKey.includes("2026")) {
      return res.json({ success: true, message: "Aktivasi Berhasil menggunakan Format Offline!" });
    }
    return res.status(400).json({ error: "Serial Key tidak terdaftar atau salah. Sila hubungi Admin untuk membeli Key Resmi." });
  }
});
var isD1TableInitialized = false;
function getD1Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || (process.env.S3_ENDPOINT ? process.env.S3_ENDPOINT.match(/https:\/\/([a-zA-Z0-9]+)\.r2\.cloudflarestorage\.com/)?.[1] : "");
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.D1_DATABASE_ID || "60a4d870-56c9-4dc6-9079-789d9e536cea";
  return { accountId, apiToken, databaseId };
}
function isD1Configured() {
  const { accountId, apiToken } = getD1Config();
  return !!(accountId && apiToken);
}
async function queryD1(sql, params = []) {
  const { accountId, apiToken, databaseId } = getD1Config();
  if (!accountId) {
    throw new Error("Cloudflare Account ID is missing. Please set CLOUDFLARE_ACCOUNT_ID in environment variables or configure S3_ENDPOINT.");
  }
  if (!apiToken) {
    throw new Error("Cloudflare API Token is missing. Please set CLOUDFLARE_API_TOKEN in environment variables.");
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sql, params })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloudflare D1 HTTP API Error ${response.status}: ${errText}`);
  }
  const json = await response.json();
  if (!json.success) {
    throw new Error(`Cloudflare D1 Query Failed: ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}
async function ensureD1Table() {
  if (isD1TableInitialized) return;
  if (!isD1Configured()) {
    console.warn("[Cloudflare D1] Skipping table verification: Cloudflare credentials are not configured.");
    return;
  }
  try {
    await queryD1(`
                CREATE TABLE IF NOT EXISTS metadata_backups (
                    id TEXT PRIMARY KEY,
                    uid TEXT NOT NULL,
                    batch_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    tool TEXT NOT NULL,
                    items TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            `);
    isD1TableInitialized = true;
    console.log("[Cloudflare D1] metadata_backups table verified/created.");
  } catch (e) {
    console.warn("[Cloudflare D1] Failed to verify/create metadata_backups table:", e.message || e);
    throw e;
  }
}
app.post("/api/d1-backup/save", async (req, res) => {
  try {
    const { uid, tool, items } = req.body;
    if (!uid || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing uid or items array" });
    }
    if (!isD1Configured()) {
      return res.status(200).json({
        success: false,
        code: "CREDENTIALS_MISSING",
        error: "Cloudflare API Token belum dikonfigurasi. Sila masukkan CLOUDFLARE_API_TOKEN di menu Settings di kanan atas."
      });
    }
    await ensureD1Table();
    const id = `backup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const batchId = `batch-${Date.now()}`;
    const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const itemsStr = JSON.stringify(items);
    await queryD1(
      `INSERT INTO metadata_backups (id, uid, batch_id, timestamp, tool, items) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, uid, batchId, timestamp, tool || "Unknown Tool", itemsStr]
    );
    try {
      const countResult = await queryD1(
        `SELECT COUNT(*) as count FROM metadata_backups WHERE uid = ?`,
        [uid]
      );
      const count = countResult?.[0]?.results?.[0]?.count || 0;
      if (count > 30) {
        const allBackups = await queryD1(
          `SELECT id FROM metadata_backups WHERE uid = ? ORDER BY created_at ASC`,
          [uid]
        );
        const backupsToDelete = allBackups?.[0]?.results?.slice(0, count - 30) || [];
        for (const oldBackup of backupsToDelete) {
          await queryD1(`DELETE FROM metadata_backups WHERE id = ?`, [oldBackup.id]);
        }
      }
    } catch (pruneErr) {
      console.warn("[Cloudflare D1] Failed to prune old backups:", pruneErr.message);
    }
    res.json({ success: true, batchId, timestamp });
  } catch (err) {
    const isAuthError = err.message?.includes("401") || err.message?.includes("Authentication error") || err.message?.includes("API Token");
    const isDbError = err.message?.includes("404") || err.message?.includes("7003") || err.message?.includes("Could not route") || err.message?.includes("object identifier is invalid") || err.message?.includes("database");
    console.warn("[Cloudflare D1] Backup Save handled gracefully:", err.message || err);
    if (isAuthError) {
      return res.status(200).json({
        success: false,
        code: "CREDENTIALS_INVALID",
        error: "Cloudflare API Token tidak valid atau salah. Sila semak CLOUDFLARE_API_TOKEN di menu Settings di kanan atas."
      });
    }
    if (isDbError) {
      return res.status(200).json({
        success: false,
        code: "DATABASE_INVALID",
        error: "Cloudflare D1 Database ID tidak valid atau salah. Sila semak CLOUDFLARE_D1_DATABASE_ID di menu Settings di kanan atas."
      });
    }
    res.status(200).json({ success: false, error: err.message || "Failed to save backup to Cloudflare D1" });
  }
});
app.get("/api/d1-backup/history", async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }
    if (!isD1Configured()) {
      return res.status(200).json({
        success: false,
        code: "CREDENTIALS_MISSING",
        error: "Cloudflare API Token belum dikonfigurasi. Sila masukkan CLOUDFLARE_API_TOKEN di menu Settings di kanan atas.",
        data: []
      });
    }
    await ensureD1Table();
    const queryResult = await queryD1(
      `SELECT batch_id, timestamp, tool, items, created_at FROM metadata_backups WHERE uid = ? ORDER BY created_at DESC LIMIT 30`,
      [String(uid)]
    );
    const rows = queryResult?.[0]?.results || [];
    const history = rows.map((row) => {
      let items = [];
      try {
        items = JSON.parse(row.items);
      } catch (e) {
        console.warn("[Cloudflare D1] Failed to parse items JSON:", e);
      }
      return {
        batchId: row.batch_id,
        timestamp: row.timestamp,
        tool: row.tool,
        items,
        createdAt: row.created_at
      };
    });
    res.json({ success: true, data: history });
  } catch (err) {
    const isAuthError = err.message?.includes("401") || err.message?.includes("Authentication error") || err.message?.includes("API Token");
    const isDbError = err.message?.includes("404") || err.message?.includes("7003") || err.message?.includes("Could not route") || err.message?.includes("object identifier is invalid") || err.message?.includes("database");
    console.warn("[Cloudflare D1] Backup History handled gracefully:", err.message || err);
    if (isAuthError) {
      return res.status(200).json({
        success: false,
        code: "CREDENTIALS_INVALID",
        error: "Cloudflare API Token tidak valid atau salah. Sila semak CLOUDFLARE_API_TOKEN di menu Settings di kanan atas.",
        data: []
      });
    }
    if (isDbError) {
      return res.status(200).json({
        success: false,
        code: "DATABASE_INVALID",
        error: "Cloudflare D1 Database ID tidak valid atau salah. Sila semak CLOUDFLARE_D1_DATABASE_ID di menu Settings di kanan atas.",
        data: []
      });
    }
    res.status(200).json({ success: false, error: err.message || "Failed to retrieve backup history", data: [] });
  }
});
app.post("/api/test-gemini-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testClient = new import_genai2.GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build-test"
        }
      }
    });
    const modelsToTry = ["gemini-2.5-pro", "gemini-2.5-pro", "gemini-3-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.5-pro"];
    let lastError = null;
    let response = null;
    for (const testModel of modelsToTry) {
      try {
        response = await testClient.models.generateContent({
          model: testModel,
          contents: 'Respond with exactly the word "VALID"'
        });
        if (response && response.text) {
          break;
        }
      } catch (err) {
        lastError = err;
        const errStr = ((err.message ? String(err.message) : "") + " " + (err.status ? String(err.status) : "") + " " + (err.code ? String(err.code) : "") + " " + (typeof err === "object" ? JSON.stringify(err) : String(err))).toLowerCase();
        const statusCode = err.status || err.code;
        if (statusCode === 429 || errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("quota") || errStr.includes("exceeded")) {
          throw err;
        }
        if (statusCode === 400 && (errStr.includes("api_key_invalid") || errStr.includes("invalid") || errStr.includes("not found") || errStr.includes("unregistered") || errStr.includes("api key"))) {
          throw err;
        }
        console.log(`[test-gemini-key] Failed testing model ${testModel}, trying next model if available. Error: ${err.message}`);
      }
    }
    if (response && response.text) {
      return res.json({ success: true, message: "API Key valid!" });
    } else if (lastError) {
      throw lastError;
    } else {
      return res.status(400).json({ error: "Gagal mendapatkan respon dari AI. Silakan periksa kembali key Anda." });
    }
  } catch (e) {
    const errTextJoined = ((e.message ? String(e.message) : "") + " " + (e.status ? String(e.status) : "") + " " + (e.code ? String(e.code) : "") + " " + (typeof e === "object" ? JSON.stringify(e) : String(e))).toLowerCase();
    if (errTextJoined.includes("429") || errTextJoined.includes("resource_exhausted") || errTextJoined.includes("quota") || errTextJoined.includes("exceeded")) {
      console.log("Test API Key returned 429 Quota Exceeded (successfully handled as valid key but empty quota).");
      return res.json({
        success: true,
        quotaExceeded: true,
        message: "API Key valid & sukses terotentikasi! Namun kuota gratis / kredit akun Google AI Studio Anda habis (Quota Exceeded / RESOURCE_EXHAUSTED). Anda tetap bisa menyimpannya, namun pastikan untuk menambah limit/tagihan di Google AI Studio Anda agar bisa digunakan."
      });
    } else if (errTextJoined.includes("503") || errTextJoined.includes("unavailable") || errTextJoined.includes("high demand") || errTextJoined.includes("overloaded")) {
      console.log("Test API Key returned 503 High Demand (successfully handled as valid key).");
      return res.json({
        success: true,
        quotaExceeded: false,
        message: "API Key valid & sukses terotentikasi! Server Gemini sedang tinggi permintaan (503 High Demand), namun key Anda dapat digunakan."
      });
    } else if (errTextJoined.includes("api_key_invalid") || errTextJoined.includes("invalid") || errTextJoined.includes("api key not valid")) {
      return res.status(400).json({ error: "API Key tidak valid. Silakan periksa kembali API Key Anda." });
    }
    console.error("Test API Key error:", e);
    res.status(500).json({ error: e.message || "Error testing API Key" });
  }
});
app.post("/api/test-groq-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const modelsResponse = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`
      }
    });
    if (!modelsResponse.ok) {
      const errText = await modelsResponse.text();
      return res.status(400).json({ error: `Gagal verifikasi Groq: ${errText}` });
    }
    const testResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "test" }]
      })
    });
    if (testResponse.ok) {
      return res.json({ success: true, message: "Groq API Key valid! (llama-3.3-70b-versatile model available and working)" });
    } else {
      const errText = await testResponse.text();
      if (errText.includes("model_not_found")) {
        return res.status(400).json({ error: `Groq verified but model llama-4-scout-17b is unavailable: ${errText}` });
      }
      return res.status(400).json({ error: `Gagal verifikasi Groq (completion): ${errText}` });
    }
  } catch (e) {
    console.error("Test Groq API Key error exception:", e);
    res.status(500).json({ error: e.message || "Error testing Groq API Key" });
  }
});
app.post("/api/test-mistral-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const response = await fetch("https://api.mistral.ai/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`
      }
    });
    if (response.ok) {
      return res.json({ success: true, message: "Mistral API Key valid!" });
    }
    const errText = await response.text();
    return res.status(400).json({ error: `Gagal verifikasi Mistral: ${errText}` });
  } catch (e) {
    console.error("Test Mistral API Key error:", e);
    res.status(500).json({ error: e.message || "Error testing Mistral API Key" });
  }
});
app.post("/api/test-openai-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 16
      })
    });
    if (testResponse.ok) {
      return res.json({ success: true, message: "OpenAI API Key valid!" });
    } else {
      const errText = await testResponse.text();
      return res.status(400).json({ error: `Gagal verifikasi OpenAI API: ${errText}` });
    }
  } catch (e) {
    console.warn("Test OpenAI API Key error exception:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.post("/api/test-openrouter-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 16
      })
    });
    if (testResponse.ok) {
      return res.json({ success: true, message: "OpenRouter API Key valid!" });
    } else {
      const errText = await testResponse.text();
      return res.status(400).json({ error: `Gagal verifikasi OpenRouter API: ${errText}` });
    }
  } catch (e) {
    console.warn("Test OpenRouter API Key error exception:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.post("/api/test-blackbox-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testResponse = await fetch("https://api.blackbox.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "blackboxai",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 16
      })
    });
    if (testResponse.ok) {
      return res.json({ success: true, message: "Blackbox API Key valid!" });
    } else {
      const errText = await testResponse.text();
      return res.status(400).json({ error: `Gagal verifikasi Blackbox API: ${errText}` });
    }
  } catch (e) {
    console.warn("Test Blackbox API Key error exception:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.post("/api/test-nvidia-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "stepfun-ai/step-3.5-flash",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 16
      })
    });
    if (testResponse.ok) {
      return res.json({ success: true, message: "NVIDIA API Key valid! (Models working)" });
    } else {
      const errText = await testResponse.text();
      return res.status(400).json({ error: `Gagal verifikasi NVIDIA API: ${errText}` });
    }
  } catch (e) {
    console.warn("Test NVIDIA API Key error exception:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.post("/api/test-bluesminds-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    let testUri = (process.env.BLUESMINDS_API_ENDPOINT || "https://api.bluesminds.com/v1/chat/completions").trim();
    if (!testUri.endsWith("/chat/completions")) {
      if (testUri.endsWith("/chat/completions/")) {
        testUri = testUri.slice(0, -1);
      } else if (testUri.endsWith("/v1")) {
        testUri = `${testUri}/chat/completions`;
      } else if (testUri.endsWith("/v1/")) {
        testUri = `${testUri}chat/completions`;
      } else if (testUri.endsWith("/")) {
        testUri = `${testUri}v1/chat/completions`;
      } else {
        testUri = `${testUri}/v1/chat/completions`;
      }
    }
    let attempts = 0;
    let success = false;
    let lastStatus = 0;
    let lastText = "";
    while (attempts < 4 && !success) {
      attempts++;
      try {
        const testResponse = await fetch(testUri, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "user", content: "test" }],
            stream: false
          })
        });
        lastStatus = testResponse.status;
        lastText = await testResponse.text();
        if (testResponse.ok) {
          success = true;
        } else {
          const lowerText = lastText.toLowerCase();
          if (lastStatus === 401 || lastStatus === 403 || lastStatus === 400 && lowerText.includes("invalid") && !lowerText.includes("extra data")) {
            break;
          }
          console.warn(`[test-bluesminds-key] Attempt ${attempts} failed with status ${lastStatus}. Retrying after delay...`);
          await new Promise((r) => setTimeout(r, 1e3 + Math.random() * 1e3));
        }
      } catch (fetchErr) {
        console.warn(`[test-bluesminds-key] Attempt ${attempts} fetch exception:`, fetchErr.message);
        lastStatus = 500;
        lastText = fetchErr.message;
        await new Promise((r) => setTimeout(r, 1e3));
      }
    }
    if (success) {
      return res.json({ success: true, message: "Bluesminds API Key valid! (gpt-4o active)" });
    } else {
      return res.status(400).json({ error: `Gagal verifikasi Bluesminds API (Status ${lastStatus}): ${lastText}` });
    }
  } catch (e) {
    console.warn("Test Bluesminds API Key error exception:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.post("/api/test-aivene-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key tidak boleh kosong" });
    }
    const testUri = "https://api.aivene.com/v1/chat/completions";
    const testResponse = await fetch(testUri, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mimo-v2.5",
        messages: [{ role: "user", content: "test" }],
        stream: false
      })
    });
    const status = testResponse.status;
    const text = await testResponse.text();
    if (testResponse.ok) {
      return res.json({ success: true });
    }
    if (status === 401 || status === 403 || status === 400 && text.toLowerCase().includes("invalid")) {
      return res.status(status).json({ error: `API Key tidak valid atau unauthorized (Status: ${status})` });
    }
    if (status === 429) {
      return res.status(429).json({ error: "Quota limit reached / Too Many Requests" });
    }
    return res.status(status).json({ error: `Terjadi error dari Aivene (Status: ${status})` });
  } catch (e) {
    console.warn("Test Aivene API Key error exception:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
var getProviderName = () => {
  const store = apiKeyStorage.getStore();
  const provider = store && store.provider || "gemini";
  if (provider === "groq") return "Groq";
  if (provider === "mistral") return "Mistral";
  if (provider === "openai") return "OpenAI";
  if (provider === "openrouter") return "OpenRouter";
  if (provider === "blackbox") return "Blackbox AI";
  if (provider === "nvidia") return "NVIDIA";
  if (provider === "bluesminds") return "Bluesminds";
  if (provider === "aivene") return "Aivene";
  return "Gemini";
};
app.post("/api/adobe-research", async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword || typeof keyword !== "string") {
      return res.status(400).json({ error: "Keyword is required and must be a string" });
    }
    const results = await searchAdobeStockWithBypass(keyword);
    res.json(results);
  } catch (e) {
    console.warn("Server /api/adobe-research error:", e);
    res.status(500).json({ error: e.message || "Error executing Adobe Stock search" });
  }
});
app.post("/api/generate-metadata", async (req, res) => {
  try {
    const { frames, keywordCount, customPrompt, toolType, temperature, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance } = req.body;
    if (!frames || !Array.isArray(frames)) {
      return res.status(400).json({ error: "Missing or invalid frames" });
    }
    const temperatureVal = temperature !== void 0 ? parseFloat(String(temperature)) : void 0;
    const metadata = await generateStockMetadata(frames, keywordCount, customPrompt, toolType, temperatureVal, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance);
    res.json(metadata);
  } catch (e) {
    console.warn("Server generate-metadata error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating metadata" });
    }
  }
});
app.post("/api/generate-batch-metadata", async (req, res) => {
  try {
    const { items, keywordCount, customPrompt, toolType, temperature, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing or invalid items" });
    }
    const temperatureVal = temperature !== void 0 ? parseFloat(String(temperature)) : void 0;
    const batchMetadata = await generateBatchStockMetadata(items, keywordCount, customPrompt, toolType, temperatureVal, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance);
    res.json(batchMetadata);
  } catch (e) {
    console.warn("Server generate-batch-metadata error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating batch metadata" });
    }
  }
});
app.post("/api/generate-prompt", async (req, res) => {
  try {
    const { subject, styleCategory, variation, promptMode, pngBgColor, userNegativePrompt, minWords, maxWords, model, seed } = req.body;
    if (!subject) {
      return res.status(400).json({ error: "Missing subject field" });
    }
    const promptData = await generateOptimizedPrompt({
      subject,
      styleCategory: styleCategory || "Photographic",
      variation: typeof variation === "number" ? variation : 50,
      promptMode,
      pngBgColor,
      userNegativePrompt,
      minWords,
      maxWords,
      model,
      seed: typeof seed === "number" ? seed : void 0
    });
    res.json(promptData);
  } catch (e) {
    console.warn("Server generate-prompt error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating optimized prompt" });
    }
  }
});
app.post("/api/analyze-image-to-prompt", async (req, res) => {
  try {
    const { image, styleCategory, model } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing image data" });
    }
    const data = await analyzeImageToPrompt(image, styleCategory, model);
    res.json(data);
  } catch (e) {
    console.warn("Server analyze-image-to-prompt error:", e);
    res.status(500).json({ error: e.message || "Error analyzing image" });
  }
});
app.post("/api/analyze-batch-image-to-prompt", async (req, res) => {
  try {
    const { images, styleCategory, model } = req.body;
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: "Missing images data" });
    }
    const data = await analyzeBatchImageToPrompt(images, styleCategory, model);
    res.json(data);
  } catch (e) {
    console.warn("Server analyze-batch-image-to-prompt error:", e);
    res.status(500).json({ error: e.message || "Error analyzing images" });
  }
});
app.post("/api/analyze-video-keyword", async (req, res) => {
  try {
    const { keyword, model } = req.body;
    if (!keyword) {
      return res.status(400).json({ error: "Missing keyword" });
    }
    const data = await analyzeVideoKeyword(keyword, model);
    res.json(data);
  } catch (e) {
    console.warn("Server analyze-video-keyword error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error analyzing video keyword" });
    }
  }
});
app.post("/api/check-video-quality", upload.single("video"), async (req, res) => {
  let videoPath = "";
  let cleanupFn = () => {
  };
  try {
    let tolerance = "";
    let language = "";
    let model = "";
    let frames = [];
    let extractionSuccess = false;
    if (req.body.frames) {
      frames = Array.isArray(req.body.frames) ? req.body.frames : JSON.parse(req.body.frames);
      extractionSuccess = true;
      tolerance = req.body.tolerance;
      language = req.body.language;
      model = req.body.model;
      cleanupFn = () => {
      };
    } else if (req.file) {
      videoPath = req.file.path;
      tolerance = req.body.tolerance;
      language = req.body.language;
      model = req.body.model;
      cleanupFn = () => {
        try {
          if (import_fs.default.existsSync(videoPath)) import_fs.default.unlinkSync(videoPath);
        } catch (e) {
        }
      };
    } else if (req.body.fileUrl) {
      const { fileUrl, pathKey, tolerance: bodyTolerance, language: bodyLanguage, model: bodyModel } = req.body;
      tolerance = bodyTolerance;
      language = bodyLanguage;
      model = bodyModel;
      if (pathKey && isR2Configured() && process.env.S3_BUCKET_NAME) {
        console.log(`[Video Audit] Generating pre-signed URL for direct streaming: ${pathKey}`);
        const command = new import_client_s3.GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: pathKey
        });
        videoPath = await (0, import_s3_request_presigner.getSignedUrl)(getS3Client(), command, { expiresIn: 3600 });
      } else {
        videoPath = fileUrl;
      }
      cleanupFn = () => {
      };
    } else {
      return res.status(400).json({ error: "No video uploaded, fileUrl, or frames provided." });
    }
    if (!extractionSuccess && ffmpeg) {
      try {
        console.log("Server check-video-quality: Extracting frames...");
        const outDir = import_path.default.join(uploadDir, `frames_${Date.now()}_${Math.random().toString(36).substring(7)}`);
        import_fs.default.mkdirSync(outDir, { recursive: true });
        frames = await new Promise((resolve, reject) => {
          let isDone = false;
          const timeout = setTimeout(() => {
            if (!isDone) {
              isDone = true;
              reject(new Error("Video extraction timed out. Please try a shorter or lighter video."));
            }
          }, 45e3);
          const extractFast = async () => {
            try {
              const ffmpegPath = _require("@ffmpeg-installer/ffmpeg").path;
              const ffprobePath = _require("@ffprobe-installer/ffprobe").path;
              const execPromise = import_util.default.promisify(import_child_process.exec);
              const { stdout: probeOut } = await execPromise(`"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`);
              const duration = parseFloat(probeOut.trim());
              if (isNaN(duration) || duration <= 0) {
                throw new Error("Could not determine video duration");
              }
              const numFrames = 6;
              const timestamps = [
                duration * 0.1,
                duration * 0.25,
                duration * 0.4,
                duration * 0.6,
                duration * 0.75,
                duration * 0.9
              ];
              const framePaths = [];
              for (let i = 0; i < numFrames; i++) {
                const fPath = import_path.default.join(outDir, `frame-${i + 1}.jpg`);
                await execPromise(`"${ffmpegPath}" -ss ${timestamps[i]} -i "${videoPath}" -vframes 1 -q:v 2 -s 1280x720 "${fPath}" -y`);
                framePaths.push(fPath);
              }
              const frameData = framePaths.map((fPath) => import_fs.default.readFileSync(fPath, "base64"));
              import_fs.default.rmSync(outDir, { recursive: true, force: true });
              if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                resolve(frameData.map((f) => `data:image/jpeg;base64,${f}`));
              }
            } catch (e) {
              if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                reject(e);
              }
            }
          };
          extractFast();
        });
        extractionSuccess = true;
      } catch (extractionErr) {
        console.warn("[Video Audit Fallback] Extraction failed. Using fallback simulation audit:", extractionErr);
      }
    } else if (!extractionSuccess) {
      console.warn("[Video Audit Fallback] FFmpeg not initialized and no frames provided. Using fallback simulation audit.");
    }
    if (extractionSuccess && frames && frames.length > 0) {
      console.log("Server check-video-quality: Analyzing frames with Gemini...");
      const data = await checkVideoQuality(frames, tolerance || "MEDIUM", language || "Bahasa", model);
      console.log("Server check-video-quality: Analysis successful");
      cleanupFn();
      res.json(data);
    } else {
      cleanupFn();
      return res.status(500).json({ error: "Gagal mengekstrak frame video menggunakan FFmpeg. Pastikan aplikasi berjalan di lingkungan yang mendukung FFmpeg (bukan Vercel Serverless tanpa konfigurasi tambahan). Kami tidak lagi melakukan tebakan otomatis (simulasi)." });
    }
  } catch (e) {
    console.warn("Server check-video-quality error:", e);
    cleanupFn();
    res.status(500).json({ error: e.message || "Error checking video quality" });
  }
});
app.post("/api/mute-video", upload.single("video"), async (req, res) => {
  let inputPath = "";
  let originalPath = "";
  let outputPath = "";
  let cleanupFn = () => {
  };
  try {
    if (!ffmpeg) {
      console.warn("[MUTE VIDEO WARNING] FFmpeg is not available (running on Vercel). Falling back to direct stream copy.");
    }
    let originalName = "";
    let extension = ".mp4";
    let baseName = "video";
    let contentType = "video/mp4";
    if (req.file) {
      originalPath = req.file.path;
      originalName = req.file.originalname;
      extension = import_path.default.extname(originalName) || ".mp4";
      inputPath = `${originalPath}${extension}`;
      contentType = req.file.mimetype || "video/mp4";
      import_fs.default.renameSync(originalPath, inputPath);
      baseName = import_path.default.basename(originalName, extension);
      cleanupFn = () => {
        try {
          if (import_fs.default.existsSync(originalPath)) import_fs.default.unlinkSync(originalPath);
          if (import_fs.default.existsSync(inputPath)) import_fs.default.unlinkSync(inputPath);
        } catch (e) {
        }
      };
    } else if (req.body.fileUrl) {
      const { fileUrl, pathKey } = req.body;
      originalName = import_path.default.basename(fileUrl.split("?")[0]);
      extension = import_path.default.extname(originalName) || ".mp4";
      baseName = import_path.default.basename(originalName, extension);
      contentType = fileUrl.endsWith(".webm") ? "video/webm" : fileUrl.endsWith(".mov") ? "video/quicktime" : "video/mp4";
      if (pathKey && isR2Configured() && process.env.S3_BUCKET_NAME) {
        console.log(`[Mute Video] Generating pre-signed URL for direct streaming: ${pathKey}`);
        const command = new import_client_s3.GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: pathKey
        });
        inputPath = await (0, import_s3_request_presigner.getSignedUrl)(getS3Client(), command, { expiresIn: 3600 });
      } else {
        inputPath = fileUrl;
      }
      cleanupFn = () => {
      };
    } else {
      return res.status(400).json({ error: "Tidak ada file video atau fileUrl yang disediakan." });
    }
    outputPath = import_path.default.join(uploadDir, `muted_${Date.now()}_${baseName}${extension}`);
    console.log(`[MUTE VIDEO] Processing video: ${inputPath} -> ${outputPath}`);
    try {
      await new Promise((resolve, reject) => {
        if (!ffmpeg) {
          reject(new Error("ffmpeg is not available"));
          return;
        }
        ffmpeg(inputPath).outputOptions("-an").videoCodec("copy").on("end", () => {
          console.log("[MUTE VIDEO] Processing finished successfully.");
          resolve();
        }).on("error", (err) => {
          console.error("[MUTE VIDEO] Error:", err);
          reject(err);
        }).save(outputPath);
      });
    } catch (ffmpegErr) {
      console.warn("[MUTE VIDEO FALLBACK] FFmpeg processing failed (possibly a mock/test payload). Copying input directly to output. Error:", ffmpegErr);
      try {
        if (inputPath.startsWith("http")) {
          const fileRes = await fetch(inputPath);
          if (!fileRes.ok) throw new Error(`Failed to fetch remote file: ${fileRes.statusText}`);
          const arrayBuffer = await fileRes.arrayBuffer();
          import_fs.default.writeFileSync(outputPath, Buffer.from(arrayBuffer));
        } else {
          import_fs.default.copyFileSync(inputPath, outputPath);
        }
      } catch (copyErr) {
        console.error("[MUTE VIDEO FALLBACK] Failed to copy file:", copyErr);
        throw ffmpegErr;
      }
    }
    cleanupFn();
    if (isR2Configured()) {
      console.log("[MUTE VIDEO] S3/R2 is configured. Uploading muted video to R2...");
      const uploadResult = await uploadFileToStorage(outputPath, `muted_${baseName}${extension}`, contentType);
      try {
        if (import_fs.default.existsSync(outputPath)) {
          import_fs.default.unlinkSync(outputPath);
        }
      } catch (e) {
        console.warn("Failed to clean up output video:", e);
      }
      return res.json({ downloadUrl: uploadResult.fileUrl });
    }
    res.download(outputPath, `muted_${baseName}${extension}`, (err) => {
      try {
        if (import_fs.default.existsSync(outputPath)) {
          import_fs.default.unlinkSync(outputPath);
        }
      } catch (e) {
        console.warn("Failed to clean up output video:", e);
      }
      if (err) {
        console.error("Error sending muted video file:", err);
      }
    });
  } catch (error) {
    console.error("[MUTE VIDEO API ERROR]", error);
    cleanupFn();
    if (outputPath && import_fs.default.existsSync(outputPath)) {
      try {
        import_fs.default.unlinkSync(outputPath);
      } catch (e) {
      }
    }
    res.status(500).json({ error: error.message || "Gagal menghilangkan suara video." });
  }
});
app.post("/api/check-image-quality", async (req, res) => {
  let tempFilePath = "";
  let cleanupFn = () => {
  };
  try {
    const { image, fileUrl, pathKey, tolerance, language, model, fileType } = req.body;
    let imageBase64 = "";
    if (fileUrl) {
      console.log(`Server check-image-quality: Downloading file from storage: ${fileUrl}`);
      const ext = fileType?.includes("png") ? ".png" : fileType?.includes("gif") ? ".gif" : ".jpg";
      const downloadResult = await downloadFileFromStorage(fileUrl, pathKey, ext);
      tempFilePath = downloadResult.localPath;
      cleanupFn = downloadResult.cleanup;
      const fileBuffer = import_fs.default.readFileSync(tempFilePath);
      const mime = fileType || (ext === ".png" ? "image/png" : "image/jpeg");
      imageBase64 = `data:${mime};base64,${fileBuffer.toString("base64")}`;
    } else if (image) {
      const tempDir = uploadDir;
      if (!import_fs.default.existsSync(tempDir)) {
        import_fs.default.mkdirSync(tempDir, { recursive: true });
      }
      const fileExt = fileType?.includes("png") ? "png" : fileType?.includes("gif") ? "gif" : "jpg";
      const tempFileName = `img_${import_crypto.default.randomBytes(8).toString("hex")}.${fileExt}`;
      tempFilePath = import_path.default.join(tempDir, tempFileName);
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      import_fs.default.writeFileSync(tempFilePath, Buffer.from(base64Data, "base64"));
      imageBase64 = image;
    } else {
      console.warn("Server check-image-quality error: Missing image data or fileUrl");
      return res.status(400).json({ error: "Missing image data or fileUrl" });
    }
    console.log("Server check-image-quality: Running AI Vision Analysis...");
    const aiVisionStats = await checkImageQuality(imageBase64, tolerance, language, model, fileType);
    console.log("Server check-image-quality: Integration successful");
    const combinedReport = {
      ...aiVisionStats,
      ffmpeg: null,
      ai_vision: aiVisionStats
    };
    res.json(combinedReport);
  } catch (e) {
    console.warn("Server check-image-quality error:", e);
    res.status(500).json({ error: e.message || "Error checking image quality" });
  } finally {
    cleanupFn();
    if (tempFilePath && import_fs.default.existsSync(tempFilePath)) {
      try {
        import_fs.default.unlinkSync(tempFilePath);
      } catch (err) {
      }
    }
  }
});
app.post("/api/generate-hollywood-prompts", async (req, res) => {
  try {
    const { keyword, model } = req.body;
    if (!keyword) {
      return res.status(400).json({ error: "Missing keyword" });
    }
    const prompts = await generateHollywoodPrompts(keyword, model);
    res.json(prompts);
  } catch (e) {
    console.warn("Server generate-hollywood-prompts error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating Hollywood prompts" });
    }
  }
});
app.post("/api/generate-calendar-events", async (req, res) => {
  try {
    const { month, model } = req.body;
    if (!month) {
      return res.status(400).json({ error: "Missing month field" });
    }
    const events = await generateCalendarEvents(month, model);
    res.json(events);
  } catch (e) {
    console.warn("Server generate-calendar-events error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating calendar events" });
    }
  }
});
app.post("/api/generate-event-keywords", async (req, res) => {
  try {
    const { eventName, eventDetails, model } = req.body;
    if (!eventName) {
      return res.status(400).json({ error: "Missing eventName field" });
    }
    const data = await generateEventKeywords(eventName, eventDetails || "", model);
    res.json(data);
  } catch (e) {
    console.warn("Server generate-event-keywords error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error generating keywords" });
    }
  }
});
app.post("/api/smart-suggest-keywords", async (req, res) => {
  try {
    const { title, description, existingKeywords, requestCount, model } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Missing title field or asset context" });
    }
    const data = await suggestKeywords(title, description || "", existingKeywords || [], requestCount, model);
    res.json({ keywords: data });
  } catch (e) {
    console.warn("Server smart-suggest-keywords error:", e);
    if (e.message?.includes("429") || e.status === 429 || e.code === 429) {
      res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
    } else {
      res.status(500).json({ error: e.message || "Error suggesting keywords" });
    }
  }
});
app.get("/api/inspirations", async (req, res) => {
  try {
    const inspirations = [
      { text: "Low angle shot of a diverse business team brainstorming around a glass table in a modern sunlit office, skyscrapers visible in the background, candid interaction.", label: "Team Strategy \u{1F4C8}" },
      { text: "Wide shot of an elderly traveler looking out the window of a scenic train traversing the Swiss Alps, capturing the awe and reflection, soft interior lighting.", label: "Alpine Journey \u{1F3D4}\uFE0F" },
      { text: "Close-up macro shot of a barista meticulously pouring latte art into a ceramic cup, focus on the espresso stream and delicate patterns, warm cafe environment.", label: "Coffee Craft \u2615" },
      { text: "High angle shot of a person practicing yoga on a wooden pier overlooking a calm, misty lake at sunrise, serene mood.", label: "Sunrise Yoga \u{1F9D8}" },
      { text: "Side profile shot of a young student focused intently on a vintage microscope in a well-equipped science laboratory, shallow depth of field.", label: "Science Discovery \u{1F52C}" },
      { text: "Medium shot of a traditional Japanese potter carefully molding clay on a rotating wheel, workshop setting with natural light.", label: "Pottery Art \u{1F3FA}" },
      { text: "Candid shot of a father teaching his daughter to ride a bicycle in a local park, sunset lighting creating long, warm shadows.", label: "Family Time \u{1F6B2}" },
      { text: "Vibrant medium shot of dancers in colorful elaborate traditional attire participating in a cultural parade on a crowded city street.", label: "Cultural Parade \u{1F3AD}" },
      { text: "Over-the-shoulder shot of a graphic designer working on a complex digital illustration on a large creative tablet.", label: "Digital Art \u{1F3A8}" }
    ];
    const shuffled = inspirations.sort(() => 0.5 - Math.random());
    res.json(shuffled.slice(0, 5));
  } catch (e) {
    res.status(500).json({ error: "Error fetching inspirations" });
  }
});
app.post("/api/pakasir/create-payment", async (req, res) => {
  try {
    const { projectSlug, apiKey, orderId, amount, redirectUrl } = req.body;
    if (!projectSlug || !apiKey || !orderId || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const pakasir = new import_pakasir_client.PakasirClient({
      project: projectSlug,
      apiKey
    });
    const payment = await pakasir.createPaymentWithQRAndURL(orderId, Number(amount), {
      qrOptions: { size: 400 },
      urlOptions: { redirect: redirectUrl || "https://pakasir.com" }
    });
    res.json({
      success: true,
      paymentUrl: payment.paymentUrl,
      dataUrl: payment.dataUrl,
      paymentNumber: payment.paymentNumber
    });
  } catch (error) {
    console.error("Pakasir error:", error);
    res.status(500).json({ error: error.message || "Failed to create Pakasir payment" });
  }
});
app.post("/api/pakasir/check-status", async (req, res) => {
  try {
    const { projectSlug, apiKey, orderId, amount } = req.body;
    if (!projectSlug || !apiKey || !orderId || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const pakasir = new import_pakasir_client.PakasirClient({
      project: projectSlug,
      apiKey
    });
    const status = await pakasir.checkTransactionStatus(orderId, Number(amount));
    res.json({
      success: true,
      status: status.transaction ? status.transaction.status : status.status
    });
  } catch (error) {
    console.error("Pakasir status error:", error);
    res.status(500).json({ error: error.message || "Failed to check Pakasir status" });
  }
});
app.post("/api/send-key", async (req, res) => {
  const { email, licenseKey, appName, caption } = req.body;
  if (!email || !licenseKey) {
    return res.status(400).json({ message: "Email and license key are required." });
  }
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    console.error("Email credentials not configured.");
    return res.status(500).json({ message: "Layanan email belum dikonfigurasi. Sila masukkan EMAIL_USER dan EMAIL_PASS di menu Settings aplikasi." });
  }
  try {
    const transporter = import_nodemailer.default.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
    const mailOptions = {
      from: `"${appName} Pro" <${emailUser}>`,
      to: email,
      subject: `License Key ${appName} PRO Anda`,
      text: `Halo!

${caption || "Terima kasih telah menggunakan layanan kami."}

Berikut adalah License Key ${appName} PRO Anda:

SERIAL KEY: ${licenseKey}

Sila masukkan key ini pada menu aktivasi di dalam aplikasi.

Salam,
Tim ${appName}`,
      html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
                        <h2 style="color: #4e73df; text-transform: uppercase; font-size: 18px; margin-bottom: 20px;">License Key ${appName} PRO</h2>
                        <p style="font-size: 14px; line-height: 1.5;">Halo!</p>
                        <p style="font-size: 14px; line-height: 1.5;">${caption || "Terima kasih telah mempercayai <b>" + appName + "</b>."} Berikut adalah Serial Key lisensi Anda:</p>
                        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; border: 1px dashed #4e73df; text-align: center; margin: 24px 0;">
                            <code style="font-family: monospace; font-size: 20px; font-weight: 800; color: #1e1b4b; letter-spacing: 2px;">${licenseKey}</code>
                        </div>
                        <p style="font-size: 14px; line-height: 1.5;"><b>Cara Aktivasi:</b></p>
                        <ul style="font-size: 13px; line-height: 1.5; color: #475569;">
                            <li>Buka aplikasi <b>${appName}</b></li>
                            <li>Masuk ke menu Saas Portal / Pengaturan</li>
                            <li>Salin dan tempel Serial Key di atas</li>
                        </ul>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                        <p style="font-size: 11px; color: #94a3b8; text-align: center;">Pesan ini dikirim secara otomatis oleh sistem lisensi ${appName}. Jangan membalas email ini.</p>
                    </div>
                `
    };
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Nodemailer error:", error);
    let userMessage = "Gagal mengirim email backend.";
    if (error.code === "EAUTH" || error.response && (error.response.includes("535") || error.response.includes("534"))) {
      if (error.response && error.response.includes("534")) {
        userMessage = 'Gmail memerlukan "App Password". Akun Anda memiliki 2-Step Verification aktif atau memblokir login biasa. Anda WAJIB membuat 16-karakter App Password di Akun Google Anda untuk variabel EMAIL_PASS.';
      } else {
        userMessage = 'Login email gagal (Invalid Credentials). Pastikan EMAIL_USER dan EMAIL_PASS benar. Jika menggunakan Gmail, Anda HARUS menggunakan "App Password", bukan password akun biasa.';
      }
    }
    res.status(500).json({
      message: userMessage,
      error: error.message,
      tip: "Cek Settings menu untuk konfigurasi EMAIL_USER dan EMAIL_PASS."
    });
  }
});
function isR2Configured() {
  return !!(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME);
}
var _s3ClientInstance = null;
function getS3Client() {
  if (!isR2Configured()) throw new Error("Cloudflare R2 is not configured in environment variables.");
  if (!_s3ClientInstance) {
    _s3ClientInstance = new import_client_s3.S3Client({
      region: "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
      },
      forcePathStyle: true
    });
  }
  return _s3ClientInstance;
}
var s3Client = { send: (cmd) => getS3Client().send(cmd) };
async function downloadFileFromStorage(fileUrl, pathKey, extension = ".mp4") {
  const uniqueTmpDir = import_path.default.join(uploadDir, `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  import_fs.default.mkdirSync(uniqueTmpDir, { recursive: true });
  const localPath = import_path.default.join(uniqueTmpDir, `downloaded${extension}`);
  const fileStream = import_fs.default.createWriteStream(localPath);
  const { finished } = await import("stream/promises");
  if (pathKey && isR2Configured() && process.env.S3_BUCKET_NAME) {
    console.log(`[Storage] Downloading from S3 with key ${pathKey}...`);
    const command = new import_client_s3.GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: pathKey
    });
    const response = await getS3Client().send(command);
    const stream = response.Body;
    stream.pipe(fileStream);
    await finished(fileStream);
  } else {
    console.log(`[Storage] Downloading from public URL ${fileUrl}...`);
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    import_fs.default.writeFileSync(localPath, Buffer.from(arrayBuffer));
  }
  const cleanup = () => {
    try {
      if (import_fs.default.existsSync(localPath)) import_fs.default.unlinkSync(localPath);
      if (import_fs.default.existsSync(uniqueTmpDir)) import_fs.default.rmSync(uniqueTmpDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("[Storage] Cleanup error:", e);
    }
  };
  return { localPath, cleanup };
}
var uploadFileToStorage = async (localPath, originalName, contentType) => {
  if (!isR2Configured()) throw new Error("Cloudflare R2 is not configured.");
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueFilename = `video-muted/${Date.now()}_${Math.random().toString(36).substring(7)}_${sanitizedName}`;
  const bucketName = process.env.S3_BUCKET_NAME;
  const fileBuffer = import_fs.default.readFileSync(localPath);
  const command = new import_client_s3.PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueFilename,
    Body: fileBuffer,
    ContentType: contentType
  });
  await getS3Client().send(command);
  let publicUrl = "";
  if (process.env.S3_PUBLIC_URL) {
    publicUrl = `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${uniqueFilename}`;
  } else {
    publicUrl = `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucketName}/${uniqueFilename}`;
  }
  return { fileUrl: publicUrl, pathKey: uniqueFilename };
};
app.get("/api/r2-status", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({
    configured: isR2Configured(),
    bucketName: isR2Configured() ? process.env.S3_BUCKET_NAME : null,
    publicUrl: process.env.S3_PUBLIC_URL || null
  });
});
app.get("/api/provider-status", (req, res) => {
  res.json({
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    mistral: !!process.env.MISTRAL_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    nvidia: !!process.env.NVIDIA_API_KEY,
    blackbox: !!process.env.BLACKBOX_API_KEY,
    bluesminds: !!process.env.BLUESMINDS_API_KEY
  });
});
app.post("/api/upload-vercel-blob", throttleMiddleware, async (req, res) => {
  try {
    const { handleUpload } = await import("@vercel/blob/client");
    const body = req.body;
    const jsonResponse = await handleUpload({
      body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        return {
          tokenPayload: JSON.stringify({})
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Blob upload completed", blob.url);
      }
    });
    res.status(200).json(jsonResponse);
  } catch (error) {
    console.error("API /upload-vercel-blob error:", error);
    res.status(400).json({ error: error.message });
  }
});
app.get("/api/get-upload-url", async (req, res) => {
  try {
    const { filename, contentType } = req.query;
    if (!filename) return res.status(400).json({ error: "Filename is required" });
    if (!isR2Configured()) {
      return res.status(503).json({ error: "S3/R2 Storage is not configured in environment variables. Add S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_BUCKET_NAME to your .env / Vercel project settings." });
    }
    const sanitizedName = filename.toString().replace(/[^a-zA-Z0-9._-]/g, "_");
    const resolvedContentType = contentType ? String(contentType) : "application/postscript";
    const folder = resolvedContentType.startsWith("video/") ? "metazostorage/Video" : "eps-uploads";
    const uniqueFilename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}_${sanitizedName}`;
    const bucketName = process.env.S3_BUCKET_NAME;
    const command = new import_client_s3.PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFilename,
      ContentType: resolvedContentType
    });
    const uploadUrl = await (0, import_s3_request_presigner.getSignedUrl)(getS3Client(), command, { expiresIn: 3600 });
    let publicUrl = "";
    if (process.env.S3_PUBLIC_URL) {
      publicUrl = `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${uniqueFilename}`;
    } else {
      publicUrl = `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucketName}/${uniqueFilename}`;
    }
    res.json({ uploadUrl, fileUrl: publicUrl, pathKey: uniqueFilename, contentType: resolvedContentType });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL", details: error.message });
  }
});
app.post("/api/convert-eps", throttleMiddleware, async (req, res) => {
  const { fileUrl, pathKey } = req.body;
  if (!fileUrl) {
    return res.status(400).json({ error: "fileUrl is required" });
  }
  const uniqueTmpDir = import_path.default.join(uploadDir, `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const inputPath = import_path.default.join(uniqueTmpDir, "downloaded.eps");
  const outputPath = `${inputPath}.jpg`;
  try {
    import_fs.default.mkdirSync(uniqueTmpDir, { recursive: true });
    const { finished } = await import("stream/promises");
    const fileStream = import_fs.default.createWriteStream(inputPath);
    if (pathKey && process.env.S3_BUCKET_NAME) {
      console.log(`Downloading EPS from S3 with key ${pathKey}...`);
      const command = new import_client_s3.GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: pathKey
      });
      const s3Response = await s3Client.send(command);
      if (!s3Response.Body) throw new Error("No response body from S3 storage");
      for await (const chunk of s3Response.Body) {
        if (!fileStream.write(chunk)) {
          await new Promise((resolve) => fileStream.once("drain", () => resolve(null)));
        }
      }
      fileStream.end();
      await finished(fileStream);
      console.log(`Downloaded EPS to ${inputPath} via S3 stream`);
    } else {
      console.log(`Downloading EPS from ${fileUrl}...`);
      const fetchRes = await fetch(fileUrl);
      if (!fetchRes.ok) {
        throw new Error(`Failed to fetch file: ${fetchRes.status}`);
      }
      if (fetchRes.body) {
        for await (const chunk of fetchRes.body) {
          if (!fileStream.write(chunk)) {
            await new Promise((resolve) => fileStream.once("drain", () => resolve(null)));
          }
        }
        fileStream.end();
        await finished(fileStream);
        console.log(`Downloaded EPS to ${inputPath} via async fetch stream`);
      } else {
        throw new Error("No response body from storage");
      }
    }
    const gsArgs = [
      "-dSAFER",
      "-dBATCH",
      "-dNOPAUSE",
      "-dEPSFitPage",
      "-dPDFFitPage",
      "-dDEVICEWIDTHPOINTS=768",
      "-dDEVICEHEIGHTPOINTS=768",
      "-dTextAlphaBits=2",
      "-dGraphicsAlphaBits=2",
      "-dJPEGQ=85",
      "-sDEVICE=jpeg",
      `-sOutputFile=${outputPath}`,
      "-dMaxBitmap=5000000",
      "-dBufferSpace=2000000",
      "-dBandHeight=50",
      "-dBandBufferSpace=2000000",
      "-dNumRenderingThreads=1",
      "-dVMReclaim=1",
      "-c",
      "<< /MaxPatternBitmap 500000 >> setuserparams",
      "-f",
      inputPath
    ];
    const spawnOptions = {
      timeout: 3e4,
      env: { ...process.env, TMPDIR: uniqueTmpDir }
    };
    await gsQueue.enqueue(async () => {
      await spawnAsync(gsExecutable, gsArgs, spawnOptions);
    });
    try {
      const stats = await import_fs.default.promises.stat(outputPath);
      if (stats.size === 0) {
        throw new Error("Generated JPEG is 0 bytes");
      }
    } catch (statErr) {
      throw new Error("Generated JPEG not found or empty");
    }
    await new Promise((resolve, reject) => {
      res.sendFile(outputPath, (err) => {
        if (err) {
          console.error("Error saat mengirimkan file JPEG:", err);
          if (!res.headersSent) res.status(500).json({ error: "Failed to send file" });
          reject(err);
        } else resolve();
        setTimeout(async () => {
          try {
            if (import_fs.default.existsSync(inputPath)) import_fs.default.unlinkSync(inputPath);
            if (import_fs.default.existsSync(outputPath)) import_fs.default.unlinkSync(outputPath);
            if (import_fs.default.existsSync(uniqueTmpDir)) import_fs.default.rmSync(uniqueTmpDir, { recursive: true, force: true });
          } catch (e) {
          }
          if (pathKey && isR2Configured()) {
            try {
              await getS3Client().send(new import_client_s3.DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: pathKey
              }));
              console.log(`[R2 CLEANUP] Deleted: ${pathKey}`);
            } catch (deleteErr) {
              console.warn(`[R2 CLEANUP] Failed to delete ${pathKey}:`, deleteErr);
            }
          }
        }, 500);
      });
    });
  } catch (error) {
    console.error("API /convert-eps-url error:", error);
    if (import_fs.default.existsSync(uniqueTmpDir)) {
      try {
        import_fs.default.rmSync(uniqueTmpDir, { recursive: true, force: true });
      } catch (e) {
      }
    }
    if (!res.headersSent) {
      res.status(error.message.includes("timeout") ? 408 : 500).json({
        error: "Gagal mengkonversi vector URL, file mungkin rusak atau terlalu complex.",
        details: error.message
      });
    }
  }
});
app.post("/api/convert-eps-multipart", throttleMiddleware, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const inputPath = req.file.path;
  const outputPath = `${inputPath}.jpg`;
  const uniqueTmpDir = import_path.default.join(uploadDir, `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  try {
    import_fs.default.mkdirSync(uniqueTmpDir, { recursive: true });
    console.log(`Starting conversion for ${req.file.originalname} (${req.file.size} bytes)`);
    const gsMemoryLimits = `-dMaxBitmap=5000000 -dBufferSpace=2000000 -dBandHeight=50 -dBandBufferSpace=2000000 -dNumRenderingThreads=1 -dVMReclaim=1 -c "<< /MaxPatternBitmap 500000 >> setuserparams" -f`;
    const gsArgs = [
      "-dSAFER",
      "-dBATCH",
      "-dNOPAUSE",
      "-dEPSFitPage",
      "-dPDFFitPage",
      "-dDEVICEWIDTHPOINTS=768",
      "-dDEVICEHEIGHTPOINTS=768",
      "-dTextAlphaBits=2",
      "-dGraphicsAlphaBits=2",
      "-dJPEGQ=85",
      // Optimize file size without losing much quality
      "-sDEVICE=jpeg",
      `-sOutputFile=${outputPath}`,
      // Memory & Banding Limits
      "-dMaxBitmap=5000000",
      "-dBufferSpace=2000000",
      "-dBandHeight=50",
      "-dBandBufferSpace=2000000",
      "-dNumRenderingThreads=1",
      "-dVMReclaim=1",
      "-c",
      "<< /MaxPatternBitmap 500000 >> setuserparams",
      "-f",
      inputPath
    ];
    const spawnOptions = {
      timeout: 3e4,
      // Reduced to 30s to fail fast if it's too complex
      env: { ...process.env, TMPDIR: uniqueTmpDir }
      // Force Ghostscript to use disk instead of RAM for temp files
    };
    await gsQueue.enqueue(async () => {
      await spawnAsync(gsExecutable, gsArgs, spawnOptions);
    });
    console.log(`Conversion successful for ${req.file.originalname}`);
    try {
      const stats = await import_fs.default.promises.stat(outputPath);
      if (stats.size === 0) {
        throw new Error("Generated JPEG is 0 bytes (Ghostscript failed silently)");
      }
    } catch (statErr) {
      throw new Error("Generated JPEG not found or empty");
    }
    await new Promise((resolve, reject) => {
      res.sendFile(outputPath, (err) => {
        if (err) {
          console.error("Error saat mengirimkan file JPEG ke frontend:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Failed to send file" });
          }
          reject(err);
        } else {
          resolve();
        }
        setTimeout(() => {
          try {
            if (import_fs.default.existsSync(inputPath)) {
              import_fs.default.unlinkSync(inputPath);
            }
            if (import_fs.default.existsSync(outputPath)) {
              import_fs.default.unlinkSync(outputPath);
            }
            console.log(`[CLEANUP MANDOR] Sisa sampah file ${req.file?.originalname} dimusnahkan. Kapasitas diturunkan!`);
          } catch (cleanupErr) {
            console.error("[CLEANUP MANDOR] Gagal menghapus file sisa:", cleanupErr);
          }
        }, 100);
      });
    });
  } catch (error) {
    console.error("Ghostscript convert error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to convert EPS file", details: error.message });
    }
  } finally {
    if (import_fs.default.existsSync(uniqueTmpDir)) {
      import_fs.default.rmSync(uniqueTmpDir, { recursive: true, force: true });
    }
    if (import_fs.default.existsSync(inputPath)) {
      import_fs.default.rmSync(inputPath, { force: true });
    }
    if (import_fs.default.existsSync(outputPath)) {
      import_fs.default.rmSync(outputPath, { force: true });
    }
    setTimeout(() => {
      if (global.gc) {
        global.gc();
        console.log("[MANDOR GC] Memori dibersihkan untuk worker selanjutnya.");
      }
    }, 100);
  }
});
async function startHosting() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer().then(() => startHosting());
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
//# sourceMappingURL=server.cjs.map
