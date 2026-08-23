/* [codemod] Entri tunggal — menggantikan ~215 tag <script>.
   Urutan = boot order asli (untuk side-effect data & registrasi window). */
import './styles_base.css';
import './styles_chrome.css';
import './styles_ai.css';
import './styles_work.css';
import './styles_modules.css';
import './data';
import './data_people';
import './data_fpm';
import './data_backoffice';
import './data_legal';
/* data_records SEBELUM data_firmops: kewajiban pemusnahan firma kini ditarik
   dari RETENTION (bukan register statis), jadi kanon Arsip harus sudah ada.
   Dependensinya (./data, ./data_backoffice) sudah dievaluasi di atas. */
import './data_records';
import './data_firmops';
import './data_travel';
import './data_licensing';
import './data_reg_compliance';
import './data_import';
import './data_templates';
import './data_knowledge';
import './canon';
import './data_proforma';
import './forensic_canon';
import './data_psak117';
import './data_isak35';
import './data_sakroadmap';
import './data_syariah';
import './data_platform';
import './data_firmfin';
import './data_pph23';
import './data_procurement';
import './data_facilities';
import './data_risk';
import './data_ojk';
import './data_legaldigital';
import './llm_providers';
import './icons';
import './contexts';
import './ui';
import './evidence';
import './related_modules_data';
import './related_modules_data2';
import './related_modules';
import './view_fpm_parts';
import './shell';
import './view_palette';
import './copilot';
import './ai_insights';
import './ai_extract';
import './view_compliance';
import './sa_canonical';
import './wp_signoff';   // P2: lapisan sign-off + bukti bersama (butuh view_wp/evidence/contexts)
import './minimap';
import './app';   // memanggil ReactDOM.createRoot(...).render
