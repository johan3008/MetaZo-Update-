
import React from 'react';
import { AdobeCategory } from './types';

export const ADOBE_CATEGORIES: AdobeCategory[] = [
  { id: 1, name: 'Animals' }, { id: 2, name: 'Buildings and Architecture' }, { id: 3, name: 'Business' },
  { id: 4, name: 'Drinks' }, { id: 5, name: 'The Environment' }, { id: 6, name: 'States of Mind' },
  { id: 7, name: 'Food' }, { id: 8, name: 'Graphic Resources' }, { id: 9, name: 'Hobbies and Leisure' },
  { id: 10, name: 'Industry' }, { id: 11, name: 'Landscapes' }, { id: 12, name: 'Lifestyle' },
  { id: 13, name: 'People' }, { id: 14, name: 'Plants and Flowers' }, { id: 15, name: 'Culture and Religion' },
  { id: 16, name: 'Science' }, { id: 17, name: 'Social Issues' }, { id: 18, name: 'Sports' },
  { id: 19, name: 'Technology' }, { id: 20, name: 'Transport' }, { id: 21, name: 'Travel' }
];

export const SHUTTERSTOCK_CATEGORIES = [
  'Abstract', 'Animals/Wildlife', 'Backgrounds/Textures', 'Beauty/Fashion', 
  'Buildings/Landmarks', 'Business/Finance', 'Education', 'Food and Drink', 
  'Healthcare/Medical', 'Holidays', 'Industrial', 'Interiors', 'Miscellaneous', 
  'Nature', 'Objects', 'Parks/Outdoor', 'People', 'Religion', 'Science', 
  'Signs/Symbols', 'Sports/Recreation', 'Technology', 'Transportation', 'Vintage'
];

export const SHUTTERSTOCK_CATEGORIES_VIDEO = [
  'Animals/Wildlife', 'Backgrounds/Textures', 'Buildings/Landmarks',
  'Business/Finance', 'Education', 'Food and Drink', 'Healthcare/Medical',
  'Holidays', 'Industrial', 'Nature', 'Objects', 'People', 'Religion',
  'Science', 'Signs/Symbols', 'Sports/Recreation', 'Technology', 'Transportation'
];

export const TRANSLATIONS = {
  header_title: "MetaZo PRO",
  main_subtitle_line1: "AI-Powered Metadata Assistant",
  main_subtitle_line2: "Specializing in Adobe Stock, Shutterstock, Freepik, Vecteezy, Canva Contributors",
  
  help_button: "Grup WhatsApp & Bantuan",
  donate_button: "Donasi / Support",
  whatsapp_link: "https://chat.whatsapp.com/L7pY6H8Y6H8Y6H8Y6H8Y6H", // Placeholder for user 
  footer_text: "🔐 Developed with dedication @2026.",

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
  custom_prompt_optional: "Target Keywords (Optional):",
  custom_prompt_placeholder: "Example: 'Blue, Ocean, Summer'.",
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
};
