--
-- PostgreSQL database dump
--

\restrict UadglHYv5RdUmRwlMWbCG7w7bp7J5ZabyxFPZcxQfoW1k3Vto3swmw6PhzbaLPH

-- Dumped from database version 18.4 (Ubuntu 18.4-1.pgdg24.04+1)
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: booking_bimbingan; Type: TABLE; Schema: public; Owner: acaris_user
--

CREATE TABLE public.booking_bimbingan (
    id integer NOT NULL,
    mahasiswa_id integer,
    jadwal_id integer,
    catatan text,
    status character varying(20) DEFAULT 'menunggu'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    keterangan text
);


ALTER TABLE public.booking_bimbingan OWNER TO acaris_user;

--
-- Name: booking_bimbingan_id_seq; Type: SEQUENCE; Schema: public; Owner: acaris_user
--

CREATE SEQUENCE public.booking_bimbingan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.booking_bimbingan_id_seq OWNER TO acaris_user;

--
-- Name: booking_bimbingan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: acaris_user
--

ALTER SEQUENCE public.booking_bimbingan_id_seq OWNED BY public.booking_bimbingan.id;


--
-- Name: chatbot_messages; Type: TABLE; Schema: public; Owner: acaris_user
--

CREATE TABLE public.chatbot_messages (
    id bigint NOT NULL,
    session_id text NOT NULL,
    sender character varying(10) NOT NULL,
    message_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chatbot_messages_sender_check CHECK (((sender)::text = ANY ((ARRAY['user'::character varying, 'bot'::character varying])::text[])))
);


ALTER TABLE public.chatbot_messages OWNER TO acaris_user;

--
-- Name: chatbot_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: acaris_user
--

CREATE SEQUENCE public.chatbot_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chatbot_messages_id_seq OWNER TO acaris_user;

--
-- Name: chatbot_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: acaris_user
--

ALTER SEQUENCE public.chatbot_messages_id_seq OWNED BY public.chatbot_messages.id;


--
-- Name: chatbot_sessions; Type: TABLE; Schema: public; Owner: acaris_user
--

CREATE TABLE public.chatbot_sessions (
    id text NOT NULL,
    mahasiswa_id integer NOT NULL,
    status character varying(20) DEFAULT 'aktif'::character varying NOT NULL,
    final_summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    CONSTRAINT chatbot_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['aktif'::character varying, 'selesai'::character varying])::text[])))
);


ALTER TABLE public.chatbot_sessions OWNER TO acaris_user;

--
-- Name: dokumen_mahasiswa; Type: TABLE; Schema: public; Owner: acaris_user
--

CREATE TABLE public.dokumen_mahasiswa (
    id integer NOT NULL,
    user_id integer NOT NULL,
    document_type character varying(20) NOT NULL,
    semester integer DEFAULT 0,
    file_path text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now(),
    isi_teks_dokumen text,
    CONSTRAINT dokumen_mahasiswa_document_type_check CHECK (((document_type)::text = ANY (ARRAY[('krs'::character varying)::text, ('khs'::character varying)::text, ('transkrip'::character varying)::text])))
);


ALTER TABLE public.dokumen_mahasiswa OWNER TO acaris_user;

--
-- Name: COLUMN dokumen_mahasiswa.isi_teks_dokumen; Type: COMMENT; Schema: public; Owner: acaris_user
--

COMMENT ON COLUMN public.dokumen_mahasiswa.isi_teks_dokumen IS 'Hasil ekstraksi teks PDF';


--
-- Name: dokumen_mahasiswa_id_seq; Type: SEQUENCE; Schema: public; Owner: acaris_user
--

CREATE SEQUENCE public.dokumen_mahasiswa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dokumen_mahasiswa_id_seq OWNER TO acaris_user;

--
-- Name: dokumen_mahasiswa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: acaris_user
--

ALTER SEQUENCE public.dokumen_mahasiswa_id_seq OWNED BY public.dokumen_mahasiswa.id;


--
-- Name: dosen_pa; Type: TABLE; Schema: public; Owner: acaris_user
--

CREATE TABLE public.dosen_pa (
    id integer NOT NULL,
    user_id integer NOT NULL,
    kode_kelas character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.dosen_pa OWNER TO acaris_user;

--
-- Name: dosen_pa_id_seq; Type: SEQUENCE; Schema: public; Owner: acaris_user
--

CREATE SEQUENCE public.dosen_pa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dosen_pa_id_seq OWNER TO acaris_user;

--
-- Name: dosen_pa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: acaris_user
--

ALTER SEQUENCE public.dosen_pa_id_seq OWNED BY public.dosen_pa.id;


--
-- Name: jadwal_bimbingan; Type: TABLE; Schema: public; Owner: acaris_user
--

CREATE TABLE public.jadwal_bimbingan (
    id integer NOT NULL,
    dosen_id integer,
    tanggal date NOT NULL,
    waktu_mulai time without time zone NOT NULL,
    waktu_selesai time without time zone NOT NULL,
    kuota integer NOT NULL,
    kuota_tersisa integer NOT NULL,
    keterangan text,
    status character varying(20) DEFAULT 'tersedia'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.jadwal_bimbingan OWNER TO acaris_user;

--
-- Name: jadwal_bimbingan_id_seq; Type: SEQUENCE; Schema: public; Owner: acaris_user
--

CREATE SEQUENCE public.jadwal_bimbingan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jadwal_bimbingan_id_seq OWNER TO acaris_user;

--
-- Name: jadwal_bimbingan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: acaris_user
--

ALTER SEQUENCE public.jadwal_bimbingan_id_seq OWNED BY public.jadwal_bimbingan.id;


--
-- Name: knowledge_base; Type: TABLE; Schema: public; Owner: acaris_user
--

CREATE TABLE public.knowledge_base (
    id bigint NOT NULL,
    admin_id bigint,
    category character varying(50) NOT NULL,
    file_path character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    title character varying(255),
    file_name character varying(255),
    file_url character varying(500),
    uploaded_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT knowledge_base_category_check CHECK (((category)::text = ANY (ARRAY[('Peraturan Akademik'::character varying)::text, ('Jadwal'::character varying)::text, ('Kurikulum'::character varying)::text, ('Peraturan Rektor'::character varying)::text, ('KKNI'::character varying)::text])))
);


ALTER TABLE public.knowledge_base OWNER TO acaris_user;

--
-- Name: knowledge_base_id_seq; Type: SEQUENCE; Schema: public; Owner: acaris_user
--

CREATE SEQUENCE public.knowledge_base_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knowledge_base_id_seq OWNER TO acaris_user;

--
-- Name: knowledge_base_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: acaris_user
--

ALTER SEQUENCE public.knowledge_base_id_seq OWNED BY public.knowledge_base.id;


--
-- Name: mahasiswa; Type: TABLE; Schema: public; Owner: acaris_user
--

CREATE TABLE public.mahasiswa (
    id integer NOT NULL,
    user_id integer NOT NULL,
    angkatan integer NOT NULL,
    ipk numeric(3,2) NOT NULL,
    current_semester integer DEFAULT 1 NOT NULL,
    dosen_pa_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT mahasiswa_ipk_check CHECK (((ipk >= (0)::numeric) AND (ipk <= (4)::numeric)))
);


ALTER TABLE public.mahasiswa OWNER TO acaris_user;

--
-- Name: mahasiswa_id_seq; Type: SEQUENCE; Schema: public; Owner: acaris_user
--

CREATE SEQUENCE public.mahasiswa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mahasiswa_id_seq OWNER TO acaris_user;

--
-- Name: mahasiswa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: acaris_user
--

ALTER SEQUENCE public.mahasiswa_id_seq OWNED BY public.mahasiswa.id;


--
-- Name: otp_codes; Type: TABLE; Schema: public; Owner: acaris_user
--

CREATE TABLE public.otp_codes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    code text NOT NULL,
    type character varying(20) NOT NULL,
    is_used boolean DEFAULT false,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT otp_codes_type_check CHECK (((type)::text = ANY (ARRAY[('login'::character varying)::text, ('register'::character varying)::text, ('reset_password'::character varying)::text])))
);


ALTER TABLE public.otp_codes OWNER TO acaris_user;

--
-- Name: otp_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: acaris_user
--

CREATE SEQUENCE public.otp_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.otp_codes_id_seq OWNER TO acaris_user;

--
-- Name: otp_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: acaris_user
--

ALTER SEQUENCE public.otp_codes_id_seq OWNED BY public.otp_codes.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: acaris_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password text NOT NULL,
    role character varying(20) NOT NULL,
    npm_nip character varying(50) NOT NULL,
    profile_picture text,
    is_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('mahasiswa'::character varying)::text, ('dosen'::character varying)::text, ('admin'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO acaris_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: acaris_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO acaris_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: acaris_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: booking_bimbingan id; Type: DEFAULT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.booking_bimbingan ALTER COLUMN id SET DEFAULT nextval('public.booking_bimbingan_id_seq'::regclass);


--
-- Name: chatbot_messages id; Type: DEFAULT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.chatbot_messages ALTER COLUMN id SET DEFAULT nextval('public.chatbot_messages_id_seq'::regclass);


--
-- Name: dokumen_mahasiswa id; Type: DEFAULT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.dokumen_mahasiswa ALTER COLUMN id SET DEFAULT nextval('public.dokumen_mahasiswa_id_seq'::regclass);


--
-- Name: dosen_pa id; Type: DEFAULT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.dosen_pa ALTER COLUMN id SET DEFAULT nextval('public.dosen_pa_id_seq'::regclass);


--
-- Name: jadwal_bimbingan id; Type: DEFAULT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.jadwal_bimbingan ALTER COLUMN id SET DEFAULT nextval('public.jadwal_bimbingan_id_seq'::regclass);


--
-- Name: knowledge_base id; Type: DEFAULT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.knowledge_base ALTER COLUMN id SET DEFAULT nextval('public.knowledge_base_id_seq'::regclass);


--
-- Name: mahasiswa id; Type: DEFAULT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.mahasiswa ALTER COLUMN id SET DEFAULT nextval('public.mahasiswa_id_seq'::regclass);


--
-- Name: otp_codes id; Type: DEFAULT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.otp_codes ALTER COLUMN id SET DEFAULT nextval('public.otp_codes_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: booking_bimbingan; Type: TABLE DATA; Schema: public; Owner: acaris_user
--

COPY public.booking_bimbingan (id, mahasiswa_id, jadwal_id, catatan, status, created_at, keterangan) FROM stdin;
9	50	12	revisi	terkonfirmasi	2026-04-24 10:04:36.830876	\N
10	50	11	aku	terkonfirmasi	2026-04-24 13:23:43.823482	\N
11	50	16	uehe	terkonfirmasi	2026-04-24 14:43:02.078639	\N
12	50	17	apaya	terkonfirmasi	2026-04-26 11:15:56.240729	\N
13	50	19	ywyw	terkonfirmasi	2026-04-26 13:38:26.361025	\N
16	50	22	aku mau tidur aja deh	terkonfirmasi	2026-04-27 12:29:04.22319	\N
14	60	14	dr	dibatalkan	2026-04-26 13:43:21.719223	\N
15	60	22	validasi krs	dibatalkan	2026-04-27 12:28:20.23912	\N
17	50	24	aku mau makan	terkonfirmasi	2026-05-19 13:22:57.156551	\N
18	50	25	aku mau	terkonfirmasi	2026-05-19 13:23:18.440492	\N
19	50	26	yg	terkonfirmasi	2026-05-19 13:29:41.297057	\N
20	63	25	aku butuh medkit	terkonfirmasi	2026-05-19 13:32:55.689987	\N
21	50	27	aku mau coba ini kak hehe	terkonfirmasi	2026-05-20 14:33:35.739904	\N
\.


--
-- Data for Name: chatbot_messages; Type: TABLE DATA; Schema: public; Owner: acaris_user
--

COPY public.chatbot_messages (id, session_id, sender, message_text, created_at) FROM stdin;
1	S-1779787062378-EQI9T1	user	Apakah daftar pustaka wajib pakai Mendeley?	2026-05-26 09:17:42.385561+00
2	S-1779787062378-EQI9T1	bot	Duh sori banget bestie 😭 Aku udah cek data terbaru tapi belum nemu info pastinya nih apakah daftar pustaka wajib pakai Mendeley. Dokumen yang aku punya baru membahas tentang karya ilmiah individu sebagai pengganti tugas akhir dan definisi plagiarisme aja.\n\nBiar aman dan valid, coba konfirmasi juga ke biro akademik atau dosen PA kamu yaa 🙌	2026-05-26 09:17:47.175441+00
3	S-1779787062378-EQI9T1	user	Apakah daftar pustaka wajib pakai Mendeley?	2026-05-26 09:17:48.156199+00
4	S-1779787062378-EQI9T1	bot	Duh sori banget bestie 😭 Aku udah cek data terbaru lagi nih, tapi infonya masih sama kayak tadi. Dokumen yang aku punya belum ada yang secara spesifik nyebutin kalau daftar pustaka wajib pakai Mendeley. Adanya cuma info tentang karya ilmiah dan plagiarisme aja.\n\nBiar lebih pasti, mendingan coba konfirmasi langsung ke biro akademik atau dosen PA kamu yaa, kak! Siapa tau ada update info terbaru 🙌	2026-05-26 09:17:49.736458+00
5	S-1779787062378-EQI9T1	user	Apakah daftar pustaka wajib pakai Mendeley?	2026-05-26 09:18:00.819081+00
6	S-1779787062378-EQI9T1	bot	Duh sori banget bestie 😭 Aku udah cek data terbaru tapi belum nemu info pastinya nih apakah daftar pustaka wajib pakai Mendeley. Dokumen yang aku punya baru membahas tentang karya ilmiah individu sebagai pengganti tugas akhir dan definisi plagiarisme aja.\n\nBiar aman dan valid, coba konfirmasi juga ke biro akademik atau dosen PA kamu yaa 🙌	2026-05-26 09:18:01.829541+00
7	S-1779787062378-EQI9T1	user	Halo Aca, jadwal bimbingan saya kapan?	2026-05-26 09:18:23.29814+00
8	S-1779787062378-EQI9T1	bot	Duh sori banget bestie 😭 Aku udah coba cek data akademiknya tapi belum nemu hasil yang cocok untuk jadwal bimbingan kamu nih. Coba hubungi biro akademik atau admin SIKADU yaa biar dapat info yang lebih valid dan akurat 🙌	2026-05-26 09:18:25.308548+00
9	S-1779805545499-05EWY3	user	Apakah daftar pustaka wajib pakai Mendeley?	2026-05-26 14:25:45.504444+00
10	S-1779805545499-05EWY3	user	Halo Aca, jadwal bimbingan saya kapan?	2026-05-26 14:25:55.902735+00
\.


--
-- Data for Name: chatbot_sessions; Type: TABLE DATA; Schema: public; Owner: acaris_user
--

COPY public.chatbot_sessions (id, mahasiswa_id, status, final_summary, created_at, updated_at, closed_at) FROM stdin;
S-1779787062378-EQI9T1	67	aktif	\N	2026-05-26 09:17:42.378643+00	2026-05-26 09:17:42.378643+00	\N
S-1779805545499-05EWY3	58	aktif	\N	2026-05-26 14:25:45.499305+00	2026-05-26 14:25:45.499305+00	\N
\.


--
-- Data for Name: dokumen_mahasiswa; Type: TABLE DATA; Schema: public; Owner: acaris_user
--

COPY public.dokumen_mahasiswa (id, user_id, document_type, semester, file_path, uploaded_at, isi_teks_dokumen) FROM stdin;
65	50	krs	4	https://storage.googleapis.com/acaris-storage/knowledge-base/50-1777984628468-temp_upload_file.pdf	2026-05-05 12:37:08.560509	\N
82	50	transkrip	0	https://storage.googleapis.com/acaris-storage/knowledge-base/50-1778162204802-temp_upload_file.pdf	2026-05-07 13:56:45.000053	\N
51	50	krs	1	https://storage.googleapis.com/acaris-storage/50/user-krs-semester-1-2026-04-12-1775997781346.pdf	2026-04-12 12:43:01.411527	\N
52	50	khs	1	https://storage.googleapis.com/acaris-storage/50/user-khs-semester-1-2026-04-12-1775997784604.pdf	2026-04-12 12:43:04.671624	\N
53	50	khs	2	https://storage.googleapis.com/acaris-storage/50/user-khs-semester-2-2026-04-12-1775997788856.pdf	2026-04-12 12:43:08.921797	\N
54	50	khs	3	https://storage.googleapis.com/acaris-storage/50/user-khs-semester-3-2026-04-12-1775997793214.pdf	2026-04-12 12:43:13.289012	\N
55	50	krs	2	https://storage.googleapis.com/acaris-storage/50/user-krs-semester-2-2026-04-12-1775997796812.pdf	2026-04-12 12:43:16.8896	\N
56	50	krs	3	https://storage.googleapis.com/acaris-storage/50/user-krs-semester-3-2026-04-12-1775997799931.pdf	2026-04-12 12:43:20.022626	\N
57	50	khs	4	https://storage.googleapis.com/acaris-storage/50/user-khs-semester-4-2026-04-19-1776623420077.pdf	2026-04-19 18:30:20.284544	\N
60	60	transkrip	0	https://storage.googleapis.com/acaris-storage/60/user-transkrip-2026-04-19-1776625727448.pdf	2026-04-19 19:08:47.549711	\N
61	63	transkrip	0	https://storage.googleapis.com/acaris-storage/63/user-transkrip-2026-05-02-1777727092747.pdf	2026-05-02 13:04:52.841605	\N
63	63	krs	1	https://storage.googleapis.com/acaris-storage/63/user-krs-semester-1-2026-05-03-1777793481552.pdf	2026-05-03 07:31:21.713177	\N
84	58	khs	2	https://storage.googleapis.com/acaris-storage/58/user-khs-semester-2-2026-05-21-1779368652738.pdf	2026-05-21 13:04:12.825624	\N
85	50	krs	5	https://storage.googleapis.com/acaris-storage/50/user-krs-semester-5-2026-05-23-1779536902408.pdf	2026-05-23 11:48:22.633244	\N
86	50	khs	7	https://storage.googleapis.com/acaris-storage/knowledge-base/50-1779692087885-temp_upload_file.pdf	2026-05-25 06:54:48.093616	\N
87	67	khs	1	https://storage.googleapis.com/acaris-storage/67/user-khs-semester-1-2026-05-26-1779779786959.pdf	2026-05-26 07:16:27.073294	\N
88	67	khs	2	https://storage.googleapis.com/acaris-storage/67/user-khs-semester-2-2026-05-26-1779779787335.pdf	2026-05-26 07:16:27.417056	\N
89	67	khs	3	https://storage.googleapis.com/acaris-storage/67/user-khs-semester-3-2026-05-26-1779779787673.pdf	2026-05-26 07:16:27.741915	\N
90	67	khs	4	https://storage.googleapis.com/acaris-storage/67/user-khs-semester-4-2026-05-26-1779779787978.pdf	2026-05-26 07:16:28.053165	\N
91	67	khs	5	https://storage.googleapis.com/acaris-storage/67/user-khs-semester-5-2026-05-26-1779779788297.pdf	2026-05-26 07:16:28.363675	\N
92	67	khs	6	https://storage.googleapis.com/acaris-storage/67/user-khs-semester-6-2026-05-26-1779779788612.pdf	2026-05-26 07:16:28.680993	\N
93	67	khs	7	https://storage.googleapis.com/acaris-storage/67/user-khs-semester-7-2026-05-26-1779779788910.pdf	2026-05-26 07:16:28.977316	\N
95	67	krs	2	https://storage.googleapis.com/acaris-storage/67/user-krs-semester-2-2026-05-26-1779779789685.pdf	2026-05-26 07:16:29.761579	\N
96	67	krs	3	https://storage.googleapis.com/acaris-storage/67/user-krs-semester-3-2026-05-26-1779779790083.pdf	2026-05-26 07:16:30.150036	\N
97	67	krs	4	https://storage.googleapis.com/acaris-storage/67/user-krs-semester-4-2026-05-26-1779779790431.pdf	2026-05-26 07:16:30.495191	\N
98	67	krs	5	https://storage.googleapis.com/acaris-storage/67/user-krs-semester-5-2026-05-26-1779779790803.pdf	2026-05-26 07:16:30.880865	\N
99	67	krs	6	https://storage.googleapis.com/acaris-storage/67/user-krs-semester-6-2026-05-26-1779779791168.pdf	2026-05-26 07:16:31.247383	\N
100	67	krs	7	https://storage.googleapis.com/acaris-storage/67/user-krs-semester-7-2026-05-26-1779779791513.pdf	2026-05-26 07:16:31.575736	\N
101	67	krs	8	https://storage.googleapis.com/acaris-storage/67/user-krs-semester-8-2026-05-26-1779779791828.pdf	2026-05-26 07:16:31.900876	\N
102	67	transkrip	0	https://storage.googleapis.com/acaris-storage/67/user-transkrip-2026-05-26-1779779792488.pdf	2026-05-26 07:16:32.568376	\N
83	58	khs	1	https://storage.googleapis.com/acaris-storage/58/user-khs-semester-1-2026-05-21-1779368637153.pdf	2026-05-21 13:03:57.36696	
94	67	krs	1	https://storage.googleapis.com/acaris-storage/67/user-krs-semester-1-2026-05-26-1779779789288.pdf	2026-05-26 07:16:29.380786	
\.


--
-- Data for Name: dosen_pa; Type: TABLE DATA; Schema: public; Owner: acaris_user
--

COPY public.dosen_pa (id, user_id, kode_kelas, created_at, updated_at) FROM stdin;
17	24	DSN-GVA6	2026-04-08 07:26:31.67337	2026-04-08 07:26:31.67337
25	62	DSN-U6R0	2026-05-02 12:59:04.709017	2026-05-02 12:59:04.709017
16	21	DSN-MXZ1	2026-04-07 15:31:43.283981	2026-04-07 15:31:43.283981
26	66	DSN-CRVE	2026-05-19 06:24:05.713459	2026-05-19 06:24:05.713459
\.


--
-- Data for Name: jadwal_bimbingan; Type: TABLE DATA; Schema: public; Owner: acaris_user
--

COPY public.jadwal_bimbingan (id, dosen_id, tanggal, waktu_mulai, waktu_selesai, kuota, kuota_tersisa, keterangan, status, created_at, updated_at) FROM stdin;
12	24	2026-04-25	14:31:00	14:35:00	1	0	\N	penuh	2026-04-24 07:31:36.943189	2026-04-24 10:04:36.833892
11	24	2026-04-19	22:40:00	23:40:00	10	9	3rfr	tersedia	2026-04-18 14:40:36.629105	2026-04-24 13:23:43.82636
15	24	2026-04-24	21:42:00	21:43:00	1	1	\N	tersedia	2026-04-24 14:41:09.870765	2026-04-24 14:41:09.870765
16	24	2026-04-24	21:44:00	21:45:00	1	0	\N	penuh	2026-04-24 14:41:32.185286	2026-04-24 14:43:02.082397
18	24	2026-04-27	00:15:00	18:26:00	15	15	\N	tersedia	2026-04-26 11:15:06.919917	2026-04-26 11:15:06.919917
17	24	2026-04-26	18:15:00	18:21:00	2	1	\N	tersedia	2026-04-26 11:14:53.970267	2026-04-26 11:15:56.24462
19	24	2026-04-28	20:37:00	20:38:00	1	0	\N	penuh	2026-04-26 13:37:35.189571	2026-04-26 13:38:26.36415
14	24	2026-04-26	14:31:00	14:32:00	1	0	\N	penuh	2026-04-24 07:32:13.799479	2026-04-26 13:43:21.722121
21	24	2026-04-27	19:45:00	21:45:00	12	12	aku kan keren	tersedia	2026-04-27 10:45:41.534509	2026-04-27 10:45:41.534509
22	24	2026-04-30	19:27:00	19:28:00	2	0	bawa laptop	penuh	2026-04-27 12:27:47.958654	2026-04-27 12:29:04.226679
20	24	2026-04-29	20:38:00	20:44:00	1	1	Tidak ada keterangan	tersedia	2026-04-26 13:39:00.98659	2026-04-27 12:56:53.814458
23	24	2026-05-03	11:24:00	11:27:00	2	2	\N	tersedia	2026-05-02 04:24:48.657559	2026-05-02 04:24:48.657559
4	21	2026-04-20	09:00:00	10:00:00	5	5	Bimbingan TA rutin	tersedia	2026-04-10 14:55:12.797367	2026-04-10 14:55:12.797367
24	24	2026-05-20	20:21:00	20:22:00	1	0	\N	penuh	2026-05-19 13:21:37.470592	2026-05-19 13:22:57.164572
26	24	2026-05-19	20:32:00	20:36:00	1	0	\N	penuh	2026-05-19 13:29:24.601947	2026-05-19 13:29:41.302436
25	24	2026-05-21	20:21:00	20:22:00	2	0	\N	penuh	2026-05-19 13:21:49.151689	2026-05-19 13:32:55.695747
27	24	2026-05-22	21:36:00	21:38:00	1	0	aku ku	penuh	2026-05-19 14:37:01.798682	2026-05-20 14:33:35.746614
\.


--
-- Data for Name: knowledge_base; Type: TABLE DATA; Schema: public; Owner: acaris_user
--

COPY public.knowledge_base (id, admin_id, category, file_path, created_at, title, file_name, file_url, uploaded_at, updated_at) FROM stdin;
3	53	Peraturan Akademik	https://storage.googleapis.com/acaris-storage/knowledge-base/53-1777620417555.pdf	2026-05-01 07:26:57.684438	Peraturan Akademik Unila TI 2025	peraturan_akademik_2025.pdf	https://storage.googleapis.com/acaris-storage/knowledge-base/53-1777620417555.pdf	2026-05-01 08:35:28.332635	2026-05-06 08:52:59.692604
1	53	Jadwal	https://storage.googleapis.com/acaris-storage/knowledge-base/53-1777620382603.pdf	2026-05-01 07:26:22.736369	Jadwal TI 2025	jadwal_mk_psti_2025/2026.pdf	https://storage.googleapis.com/acaris-storage/knowledge-base/53-1777620382603.pdf	2026-05-01 08:35:28.332635	2026-05-06 08:53:08.201822
2	53	Kurikulum	https://storage.googleapis.com/acaris-storage/knowledge-base/53-1777620402630.pdf	2026-05-01 07:26:42.763864	Kurikulum TI 2025	kurikulum_ti_unila_2024.pdf	https://storage.googleapis.com/acaris-storage/knowledge-base/53-1777620402630.pdf	2026-05-01 08:35:28.332635	2026-05-06 08:53:12.559019
7	53	Peraturan Rektor	https://storage.googleapis.com/acaris-storage/knowledge-base/53-1777625055780-peraturan_rektor.pdf	2026-05-01 08:44:17.011314	Peraturan Rektor 2025	peraturan_rektor_2025.pdf	https://storage.googleapis.com/acaris-storage/knowledge-base/53-1777625055780-peraturan_rektor.pdf	2026-05-01 08:44:17.011314	2026-05-06 08:53:22.718857
\.


--
-- Data for Name: mahasiswa; Type: TABLE DATA; Schema: public; Owner: acaris_user
--

COPY public.mahasiswa (id, user_id, angkatan, ipk, current_semester, dosen_pa_id, created_at, updated_at) FROM stdin;
32	60	2020	3.99	12	62	2026-04-19 19:08:18.787792	2026-04-19 19:08:18.787792
30	57	2022	3.87	8	24	2026-04-16 17:58:47.108162	2026-04-16 17:58:47.108162
33	63	2025	1.90	5	24	2026-05-02 13:03:37.632808	2026-05-02 13:06:39.326806
31	58	2023	3.50	2	21	2026-04-18 02:34:25.558892	2026-04-18 02:34:25.558892
29	50	2021	3.93	10	24	2026-04-12 12:42:05.168392	2026-05-25 12:09:32.082547
34	67	2022	3.73	8	24	2026-05-26 07:08:32.704408	2026-05-26 07:08:32.704408
\.


--
-- Data for Name: otp_codes; Type: TABLE DATA; Schema: public; Owner: acaris_user
--

COPY public.otp_codes (id, user_id, code, type, is_used, expires_at, created_at) FROM stdin;
74	50	$2b$10$N42ddQpQbP/HNd.r5mSZ7O86hDaNSPbIjupUBHBCHgTg/N2vt689C	register	t	2026-04-12 12:47:05.442	2026-04-12 12:42:05.168392
80	57	$2b$10$AztatE1ueMJIlKDsByFGHuRRw7YeSbNU/Agki5RFveOajDXkgYCLi	register	t	2026-04-16 18:03:47.209	2026-04-16 17:58:47.108162
44	24	$2b$10$/9eSjjYta.UOYzJfx1GVBuAD9xrmfTs5ATavIvC6cL2Gkd06kh5ja	register	t	2026-04-08 07:31:31.993	2026-04-08 07:26:31.67337
84	60	$2b$10$cuBDjICx8mk5A7gxnLlHjOEooB2S8hXV1D41/C6fZspDhhoAFBGEC	register	t	2026-04-19 19:13:18.99	2026-04-19 19:08:18.787792
82	50	$2b$10$RxjSnPyusfqIM1oBBbA6Oef7zN/PRAAX5Z4vvO19HUqV3lL.pDCCS	reset_password	t	2026-04-19 18:26:41.179	2026-04-19 18:21:41.247243
86	50	$2b$10$p052VKNKUldYYLO6KoTvP.qmeQg07cFBr2vxEBf49.i8u1yFjcfIi	reset_password	t	2026-04-20 07:48:56.492	2026-04-20 07:43:56.578797
87	62	$2b$10$izVNQ9/5A4pdJQ8ilKtIn.qGEFcaGGwv3u.HypFin/W8I7sL3i2Ay	register	t	2026-05-02 13:04:05.089	2026-05-02 12:59:04.709017
88	63	$2b$10$JIDG.fI3AJu0u42prI9dMe5BIKLF8.shaDSNFcaCrUWuJIN0R5.y.	register	t	2026-05-02 13:08:37.873	2026-05-02 13:03:37.632808
89	63	$2b$10$d8N00alW0iG/M7xyHYP8NegLcP5dilvbHrobHT1gNUi4Mpb6GxEHu	reset_password	t	2026-05-02 13:14:19.064	2026-05-02 13:09:19.13187
40	21	$2b$10$ZHZ9xYWWP0oBF9EtKzRw9O4S2Y/tkhm.vhYlBJ/JudPhk/K6gFL3m	register	t	2026-04-07 15:36:43.563	2026-04-07 15:31:43.283981
55	24	$2b$10$6tPdHZgkgyKMdTvBA9/W/.5K5iLvYlOO3tn7fynITYFtggjXn9OXu	reset_password	t	2026-04-09 11:06:53.994	2026-04-09 11:01:54.0753
57	24	$2b$10$eucdAm4Mw3LAjCGtLP1FlO5FJHu7bjd.zRFAWH1eYiPn.XFO9e2vG	reset_password	t	2026-04-09 11:31:18.441	2026-04-09 11:26:18.510907
90	66	$2b$10$Ewv9BV3SDlg32mGdmVZp9.5YeavyMXBKdYdwLgOrdtDjQAfp83zma	register	t	2026-05-19 06:29:06.29	2026-05-19 06:24:05.713459
92	67	$2b$10$IwYb827gaKojI5lSd3N7WOksJH9jGwdlFf7CKYVnPxSIUY8wFJ34W	register	t	2026-05-26 07:13:32.991	2026-05-26 07:08:32.704408
81	58	$2b$10$bCG.8HV5hCTalcKFi/UMJuUZPE/MbqahdExV61r1enTV.MfOaJ9im	register	t	2026-04-18 02:39:25.905	2026-04-18 02:34:25.558892
91	58	$2b$10$NgOIujIyYz9k.rTBRGZlE.3RUev5qQnzKUhNHPwrx3nvK3MVV99qO	register	t	2026-05-21 12:53:07.565	2026-05-21 12:48:07.636793
93	58	$2b$10$5ujDwjJmVITg5/RCX1sUPOTYwMPoFbvZpmS7tlAPCvRRCea85i/IK	register	f	2026-05-26 14:30:32.933	2026-05-26 14:25:33.005958
94	58	$2b$10$XJsNEuSMbOc276jNfQbV0OrHgEA/AufvSdJgSXcqZbjmIySx7cUCu	reset_password	f	2026-05-26 14:30:36.792	2026-05-26 14:25:36.862924
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: acaris_user
--

COPY public.users (id, name, email, password, role, npm_nip, profile_picture, is_verified, created_at, updated_at) FROM stdin;
57	Oh Sehun	sehchan94@gmail.com	$2b$10$2YLAh6aFRK2PppOsIEPjAe5zozc1dLt3SYjM7tjRHGmWlpsfPR1.m	mahasiswa	2215061109	https://storage.googleapis.com/acaris-storage/profile-pictures/2215061109-1776362683473.jpeg	t	2026-04-16 17:58:47.108162	2026-04-16 17:58:47.108162
21	Gibran Rakabuming Raka	gibran@raka.com	$2b$10$C4xPrzz9bqHXll/dpqM6BuRQ7syrEM6PWSy3MYvVqZ06yJTg6IngG	dosen	198	https://storage.googleapis.com/acaris-storage/profile-pictures/198001012010011001-1775575903381.png	t	2026-04-07 15:31:43.283981	2026-04-07 15:31:43.283981
60	aku mahasewa	adityajohansahbackup1@gmail.com	$2b$10$wiFErpZgpc1zdwHDMOahjOJXUCKHeMN6F3KxSxtQQ.q79CDGw70y2	mahasiswa	121233	https://storage.googleapis.com/acaris-storage/profile-pictures/121233-1776625698881.jpeg	t	2026-04-19 19:08:18.787792	2026-04-19 19:08:18.787792
24	joko widodo S.T., M.T.	mekimarindonesia@gmail.com	$2b$10$/n43l575wDgmmX1nKOaD/.M2o7GKAb0g..cTAdYbTHIL/6EBV4MN6	dosen	112391928822211	https://storage.googleapis.com/acaris-storage/profile-pictures/112391928822-1775633191773.jpeg	t	2026-04-08 07:26:31.67337	2026-04-08 07:26:31.67337
62	Prabowo S	adityamargototo@gmail.com	$2b$10$7S46eIkUi.RlEcUSeY0queIlBQsXeFVeLsVbipFFyi/4BlcqvEQsu	dosen	7262717258162826282636	https://storage.googleapis.com/acaris-storage/profile-pictures/7262717258162826282636-1777726744838.jpeg	t	2026-05-02 12:59:04.709017	2026-05-02 12:59:04.709017
66	Dr. Ahmad	ahmad@example.com	$2b$10$mlG.FxqSRKsXPvAK5gYEZOAW8t3vUmKSQRww6Lygp9li5drTN/KZm	dosen	198001012010011001	https://storage.googleapis.com/acaris-storage/profile-pictures/198001012010011001-1779171845867.png	t	2026-05-19 06:24:05.713459	2026-05-19 06:24:05.713459
63	Den M Wyzdan Favian	intaging@gmail.com	$2b$10$Osz5qanS6g9IISMBeZ1K6u40WO4n0pbmuzXYXa97X34o5dlAPfs8m	mahasiswa	2215061091	https://storage.googleapis.com/acaris-storage/profile-pictures/2215061091-1777727200673.jpeg	t	2026-05-02 13:03:37.632808	2026-05-02 13:03:37.632808
53	Admin	admin@gmail.com	$2b$10$oSyxtAPQgdwL9q3LmBZ03e6OUbPnMdrZzgzC5fTfejcdVOUHRmzeO	admin	1221245555555	https://storage.googleapis.com/acaris-storage/profile-pictures/122124-1776175043195.jpeg	t	2026-04-14 13:55:53.610771	2026-04-14 13:55:53.610771
50	Aditya Johansah	adityajohansah@gmail.com	$2b$10$IVZlQ0nHJoYPGmmhmRiPv.UWtX/VCc.T76BWIwhh1zi2uSiwvEJum	mahasiswa	2215061039	https://storage.googleapis.com/acaris-storage/profile-pictures/2215061039-1776004920577.jpeg	t	2026-04-12 12:42:05.168392	2026-04-12 12:42:05.168392
67	Muhamad Arifin Syam	marifinsyam73@gmail.com	$2b$10$/cKu4KlEvDoT/oZarTfgduv9i9lapuaMVKx8hJa1jjt4V9qa2/23i	mahasiswa	2255061008	https://storage.googleapis.com/acaris-storage/profile-pictures/2255061008-1779779312800.png	t	2026-05-26 07:08:32.704408	2026-05-26 07:08:32.704408
58	Nama Baru	budi@example.com	$2b$10$oSyxtAPQgdwL9q3LmBZ03e6OUbPnMdrZzgzC5fTfejcdVOUHRmzeO	mahasiswa	2021010001	https://storage.googleapis.com/acaris-storage/profile-pictures/2021010001-1776479665676.png	t	2026-04-18 02:34:25.558892	2026-04-18 02:34:25.558892
\.


--
-- Name: booking_bimbingan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: acaris_user
--

SELECT pg_catalog.setval('public.booking_bimbingan_id_seq', 21, true);


--
-- Name: chatbot_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: acaris_user
--

SELECT pg_catalog.setval('public.chatbot_messages_id_seq', 10, true);


--
-- Name: dokumen_mahasiswa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: acaris_user
--

SELECT pg_catalog.setval('public.dokumen_mahasiswa_id_seq', 102, true);


--
-- Name: dosen_pa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: acaris_user
--

SELECT pg_catalog.setval('public.dosen_pa_id_seq', 26, true);


--
-- Name: jadwal_bimbingan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: acaris_user
--

SELECT pg_catalog.setval('public.jadwal_bimbingan_id_seq', 27, true);


--
-- Name: knowledge_base_id_seq; Type: SEQUENCE SET; Schema: public; Owner: acaris_user
--

SELECT pg_catalog.setval('public.knowledge_base_id_seq', 13, true);


--
-- Name: mahasiswa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: acaris_user
--

SELECT pg_catalog.setval('public.mahasiswa_id_seq', 34, true);


--
-- Name: otp_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: acaris_user
--

SELECT pg_catalog.setval('public.otp_codes_id_seq', 94, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: acaris_user
--

SELECT pg_catalog.setval('public.users_id_seq', 67, true);


--
-- Name: booking_bimbingan booking_bimbingan_pkey; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.booking_bimbingan
    ADD CONSTRAINT booking_bimbingan_pkey PRIMARY KEY (id);


--
-- Name: chatbot_messages chatbot_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT chatbot_messages_pkey PRIMARY KEY (id);


--
-- Name: chatbot_sessions chatbot_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_pkey PRIMARY KEY (id);


--
-- Name: dokumen_mahasiswa dokumen_mahasiswa_pkey; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.dokumen_mahasiswa
    ADD CONSTRAINT dokumen_mahasiswa_pkey PRIMARY KEY (id);


--
-- Name: dosen_pa dosen_pa_kode_kelas_key; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.dosen_pa
    ADD CONSTRAINT dosen_pa_kode_kelas_key UNIQUE (kode_kelas);


--
-- Name: dosen_pa dosen_pa_pkey; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.dosen_pa
    ADD CONSTRAINT dosen_pa_pkey PRIMARY KEY (id);


--
-- Name: dosen_pa dosen_pa_user_id_key; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.dosen_pa
    ADD CONSTRAINT dosen_pa_user_id_key UNIQUE (user_id);


--
-- Name: jadwal_bimbingan jadwal_bimbingan_pkey; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.jadwal_bimbingan
    ADD CONSTRAINT jadwal_bimbingan_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: mahasiswa mahasiswa_pkey; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT mahasiswa_pkey PRIMARY KEY (id);


--
-- Name: mahasiswa mahasiswa_user_id_key; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT mahasiswa_user_id_key UNIQUE (user_id);


--
-- Name: otp_codes otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_npm_nip_key; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_npm_nip_key UNIQUE (npm_nip);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_chatbot_messages_session_created; Type: INDEX; Schema: public; Owner: acaris_user
--

CREATE INDEX idx_chatbot_messages_session_created ON public.chatbot_messages USING btree (session_id, created_at, id);


--
-- Name: idx_chatbot_sessions_mahasiswa_status; Type: INDEX; Schema: public; Owner: acaris_user
--

CREATE INDEX idx_chatbot_sessions_mahasiswa_status ON public.chatbot_sessions USING btree (mahasiswa_id, status, created_at DESC);


--
-- Name: idx_chatbot_sessions_one_active_per_mahasiswa; Type: INDEX; Schema: public; Owner: acaris_user
--

CREATE UNIQUE INDEX idx_chatbot_sessions_one_active_per_mahasiswa ON public.chatbot_sessions USING btree (mahasiswa_id) WHERE ((status)::text = 'aktif'::text);


--
-- Name: idx_dokumen_user; Type: INDEX; Schema: public; Owner: acaris_user
--

CREATE INDEX idx_dokumen_user ON public.dokumen_mahasiswa USING btree (user_id);


--
-- Name: idx_dokumen_user_type; Type: INDEX; Schema: public; Owner: acaris_user
--

CREATE INDEX idx_dokumen_user_type ON public.dokumen_mahasiswa USING btree (user_id, document_type);


--
-- Name: idx_dosen_kode_kelas; Type: INDEX; Schema: public; Owner: acaris_user
--

CREATE INDEX idx_dosen_kode_kelas ON public.dosen_pa USING btree (kode_kelas);


--
-- Name: idx_otp_user_type; Type: INDEX; Schema: public; Owner: acaris_user
--

CREATE INDEX idx_otp_user_type ON public.otp_codes USING btree (user_id, type);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: acaris_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_npm_nip; Type: INDEX; Schema: public; Owner: acaris_user
--

CREATE INDEX idx_users_npm_nip ON public.users USING btree (npm_nip);


--
-- Name: booking_bimbingan booking_bimbingan_jadwal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.booking_bimbingan
    ADD CONSTRAINT booking_bimbingan_jadwal_id_fkey FOREIGN KEY (jadwal_id) REFERENCES public.jadwal_bimbingan(id);


--
-- Name: booking_bimbingan booking_bimbingan_mahasiswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.booking_bimbingan
    ADD CONSTRAINT booking_bimbingan_mahasiswa_id_fkey FOREIGN KEY (mahasiswa_id) REFERENCES public.users(id);


--
-- Name: chatbot_messages chatbot_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT chatbot_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chatbot_sessions(id) ON DELETE CASCADE;


--
-- Name: chatbot_sessions chatbot_sessions_mahasiswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_mahasiswa_id_fkey FOREIGN KEY (mahasiswa_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: dokumen_mahasiswa dokumen_mahasiswa_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.dokumen_mahasiswa
    ADD CONSTRAINT dokumen_mahasiswa_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: dosen_pa dosen_pa_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.dosen_pa
    ADD CONSTRAINT dosen_pa_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: dosen_pa fk_dosen_user; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.dosen_pa
    ADD CONSTRAINT fk_dosen_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mahasiswa fk_mahasiswa_user; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT fk_mahasiswa_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: otp_codes fk_otp_user; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: jadwal_bimbingan jadwal_bimbingan_dosen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.jadwal_bimbingan
    ADD CONSTRAINT jadwal_bimbingan_dosen_id_fkey FOREIGN KEY (dosen_id) REFERENCES public.users(id);


--
-- Name: knowledge_base knowledge_base_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: mahasiswa mahasiswa_dosen_pa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT mahasiswa_dosen_pa_id_fkey FOREIGN KEY (dosen_pa_id) REFERENCES public.dosen_pa(user_id);


--
-- Name: mahasiswa mahasiswa_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT mahasiswa_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: otp_codes otp_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acaris_user
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;
GRANT ALL ON SCHEMA public TO acaris_user;


--
-- PostgreSQL database dump complete
--

\unrestrict UadglHYv5RdUmRwlMWbCG7w7bp7J5ZabyxFPZcxQfoW1k3Vto3swmw6PhzbaLPH

