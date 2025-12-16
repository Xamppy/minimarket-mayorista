--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: format_barcode_display(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.format_barcode_display(barcode character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Formato: "1 111111 111111" -> "7 801234 56789 0"
    RETURN SUBSTRING(barcode, 1, 1) || ' ' || 
           SUBSTRING(barcode, 2, 6) || ' ' || 
           SUBSTRING(barcode, 8, 5) || ' ' || 
           SUBSTRING(barcode, 13, 1);
END;
$$;


--
-- Name: generate_gs1_chile_barcode(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_gs1_chile_barcode() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix_country VARCHAR(3) := '780'; -- Prefijo de Chile
    prefix_company VARCHAR(6) := '123456'; -- Prefijo empresa (configurable)
    product_code VARCHAR(3);
    check_digit INTEGER;
    full_code VARCHAR(12);
    sum_odd INTEGER := 0;
    sum_even INTEGER := 0;
    i INTEGER;
BEGIN
    -- Generar cÃ³digo de producto aleatorio de 3 dÃ­gitos
    product_code := LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
    
    -- Construir cÃ³digo sin dÃ­gito verificador
    full_code := prefix_country || prefix_company || product_code;
    
    -- Calcular dÃ­gito verificador segÃºn algoritmo GS1
    FOR i IN 1..12 LOOP
        IF i % 2 = 1 THEN
            sum_odd := sum_odd + CAST(SUBSTRING(full_code, i, 1) AS INTEGER);
        ELSE
            sum_even := sum_even + CAST(SUBSTRING(full_code, i, 1) AS INTEGER);
        END IF;
    END LOOP;
    
    check_digit := (10 - ((sum_odd + sum_even * 3) % 10)) % 10;
    
    RETURN full_code || check_digit::TEXT;
END;
$$;


--
-- Name: get_daily_sales_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_daily_sales_stats() RETURNS TABLE(sale_date text, total_sales numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(s.sale_date)::text as sale_date,
    SUM(s.total_amount) as total_sales
  FROM sales s
  WHERE s.sale_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(s.sale_date)
  ORDER BY DATE(s.sale_date);
END;
$$;


--
-- Name: get_products_with_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_products_with_stock() RETURNS TABLE(id uuid, name character varying, brand_name character varying, stock_quantity integer, product_type_name character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.brand_name,
        COALESCE(SUM(se.current_quantity)::integer, 0) as stock_quantity,
        pt.name as product_type_name
    FROM products p
    LEFT JOIN stock_entries se ON p.id = se.product_id AND se.current_quantity > 0
    LEFT JOIN product_types pt ON p.product_type_id = pt.id
    GROUP BY p.id, p.name, p.brand_name, pt.name
    ORDER BY p.created_at DESC;
END;
$$;


--
-- Name: get_user_email_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_email_by_id(user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM users
  WHERE id = user_id;
  
  RETURN user_email;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id;
  
  RETURN user_role;
END;
$$;


--
-- Name: get_wholesale_pricing_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_wholesale_pricing_stats() RETURNS TABLE(total_products_with_wholesale integer, total_products_without_wholesale integer, avg_wholesale_discount numeric, total_wholesale_sales integer, total_regular_sales integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Since the current schema doesn't have wholesale_price columns,
  -- we'll return default values for now
  RETURN QUERY
  SELECT 
    0::integer as total_products_with_wholesale,
    COUNT(*)::integer as total_products_without_wholesale,
    0::numeric as avg_wholesale_discount,
    0::integer as total_wholesale_sales,
    COUNT(si.*)::integer as total_regular_sales
  FROM products p
  LEFT JOIN sale_items si ON p.id = si.product_id;
END;
$$;


--
-- Name: FUNCTION get_wholesale_pricing_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_wholesale_pricing_stats() IS 'Returns wholesale pricing statistics. Currently returns default values as wholesale pricing columns are not yet implemented in the schema.';


--
-- Name: get_wholesale_vs_regular_sales(timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_wholesale_vs_regular_sales(start_date timestamp without time zone, end_date timestamp without time zone) RETURNS TABLE(sale_type text, total_sales integer, total_amount numeric, avg_sale_amount numeric, total_items_sold integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Since we don't have sale_type column in the current schema,
  -- we'll return all sales as 'regular' type
  RETURN QUERY
  SELECT 
    'regular'::text as sale_type,
    COUNT(DISTINCT s.id)::integer as total_sales,
    SUM(si.unit_price * si.quantity) as total_amount,
    AVG(si.unit_price * si.quantity) as avg_sale_amount,
    SUM(si.quantity)::integer as total_items_sold
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  WHERE s.sale_date >= start_date AND s.sale_date <= end_date;
END;
$$;


--
-- Name: FUNCTION get_wholesale_vs_regular_sales(start_date timestamp without time zone, end_date timestamp without time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_wholesale_vs_regular_sales(start_date timestamp without time zone, end_date timestamp without time zone) IS 'Returns sales comparison. Currently treats all sales as regular type as wholesale pricing is not yet implemented in the schema.';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO profiles (user_id, full_name)
  VALUES (NEW.id, NEW.email);
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE brands; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.brands IS 'Marcas de productos para organizaciÃ³n';


--
-- Name: COLUMN brands.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brands.id IS 'Clave primaria UUID Ãºnica';


--
-- Name: brands_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.brands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: brands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.brands_id_seq OWNED BY public.brands.id;


--
-- Name: generated_barcodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_barcodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barcode character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    is_active boolean DEFAULT true
);


--
-- Name: TABLE generated_barcodes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.generated_barcodes IS 'CÃ³digos de barras generados para productos y promociones especiales';


--
-- Name: COLUMN generated_barcodes.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_barcodes.id IS 'Clave primaria UUID Ãºnica';


--
-- Name: COLUMN generated_barcodes.barcode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_barcodes.barcode IS 'CÃ³digo de barras en formato GS1 Chile (sin espacios)';


--
-- Name: COLUMN generated_barcodes.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_barcodes.name IS 'Nombre del producto o promociÃ³n';


--
-- Name: COLUMN generated_barcodes.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_barcodes.description IS 'DescripciÃ³n opcional del cÃ³digo de barras';


--
-- Name: COLUMN generated_barcodes.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_barcodes.created_by IS 'UUID del usuario que creÃ³ el cÃ³digo';


--
-- Name: COLUMN generated_barcodes.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_barcodes.is_active IS 'Estado activo del cÃ³digo de barras';


--
-- Name: product_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE product_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_types IS 'CategorÃ­as/tipos de productos para clasificaciÃ³n';


--
-- Name: COLUMN product_types.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_types.id IS 'Clave primaria UUID Ãºnica';


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    brand_name character varying(255),
    image_url text,
    product_type_id uuid,
    unit_price numeric(10,2),
    box_price numeric(10,2),
    display_price numeric(10,2),
    pallet_price numeric(10,2),
    wholesale_price numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    brand_id integer,
    barcode character varying(255),
    type_id uuid,
    min_stock integer DEFAULT 10 NOT NULL,
    CONSTRAINT min_stock_non_negative CHECK ((min_stock >= 0))
);


--
-- Name: COLUMN products.brand_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.brand_id IS 'Referencia a la marca del producto';


--
-- Name: COLUMN products.type_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.type_id IS 'Referencia a la categorÃ­a/tipo del producto';


--
-- Name: stock_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    quantity integer NOT NULL,
    unit_cost numeric(10,2),
    expiration_date date,
    entry_date timestamp with time zone DEFAULT now(),
    current_quantity integer NOT NULL,
    purchase_price numeric(10,2),
    sale_price_unit numeric(10,2),
    sale_price_wholesale numeric(10,2),
    initial_quantity integer NOT NULL,
    barcode character varying(255)
);


--
-- Name: products_with_stock_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.products_with_stock_view AS
 SELECT p.id,
    p.name,
    p.brand_name,
    p.image_url,
    p.unit_price,
    p.wholesale_price,
    pt.name AS product_type_name,
    COALESCE(sum(se.current_quantity), (0)::bigint) AS total_stock,
    min(se.expiration_date) AS next_expiration_date
   FROM ((public.products p
     LEFT JOIN public.product_types pt ON ((p.product_type_id = pt.id)))
     LEFT JOIN public.stock_entries se ON ((p.id = se.product_id)))
  GROUP BY p.id, p.name, p.brand_name, p.image_url, p.unit_price, p.wholesale_price, pt.name;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    full_name character varying(255),
    phone character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid,
    product_id uuid,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    sale_type character varying(50) DEFAULT 'regular'::character varying
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    total_amount numeric(10,2) NOT NULL,
    sale_date timestamp with time zone DEFAULT now(),
    payment_method character varying(50),
    ticket_number bigint NOT NULL,
    discount_type character varying(20) DEFAULT NULL::character varying,
    discount_value numeric(12,2) DEFAULT NULL::numeric
);


--
-- Name: COLUMN sales.discount_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.discount_type IS 'Tipo de descuento aplicado: amount (monto fijo) o percentage (porcentaje)';


--
-- Name: COLUMN sales.discount_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.discount_value IS 'Valor del descuento: monto en pesos o porcentaje segÃºn discount_type';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    must_change_password boolean DEFAULT false,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['administrator'::character varying, 'vendedor'::character varying])::text[])))
);


--
-- Name: recent_sales_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.recent_sales_view AS
 SELECT s.id AS sale_id,
    s.total_amount,
    s.sale_date,
    s.payment_method,
    u.email AS user_email,
    count(si.id) AS total_items,
    sum(si.quantity) AS total_quantity
   FROM ((public.sales s
     JOIN public.users u ON ((s.user_id = u.id)))
     LEFT JOIN public.sale_items si ON ((s.id = si.sale_id)))
  GROUP BY s.id, s.total_amount, s.sale_date, s.payment_method, u.email
  ORDER BY s.sale_date DESC;


--
-- Name: sales_ticket_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_ticket_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_ticket_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_ticket_number_seq OWNED BY public.sales.ticket_number;


--
-- Name: brands id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands ALTER COLUMN id SET DEFAULT nextval('public.brands_id_seq'::regclass);


--
-- Name: sales ticket_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales ALTER COLUMN ticket_number SET DEFAULT nextval('public.sales_ticket_number_seq'::regclass);


--
-- Name: brands brands_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_key UNIQUE (name);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: generated_barcodes generated_barcodes_barcode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_barcodes
    ADD CONSTRAINT generated_barcodes_barcode_key UNIQUE (barcode);


--
-- Name: generated_barcodes generated_barcodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_barcodes
    ADD CONSTRAINT generated_barcodes_pkey PRIMARY KEY (id);


--
-- Name: product_types product_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: stock_entries stock_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entries
    ADD CONSTRAINT stock_entries_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_brands_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brands_name ON public.brands USING btree (name);


--
-- Name: idx_brands_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_brands_name_lower ON public.brands USING btree (lower((name)::text));


--
-- Name: idx_brands_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_brands_name_unique ON public.brands USING btree (lower((name)::text));


--
-- Name: idx_brands_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brands_updated ON public.brands USING btree (updated_at DESC);


--
-- Name: idx_generated_barcodes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_barcodes_active ON public.generated_barcodes USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_generated_barcodes_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_barcodes_barcode ON public.generated_barcodes USING btree (barcode);


--
-- Name: idx_generated_barcodes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_barcodes_created_at ON public.generated_barcodes USING btree (created_at DESC);


--
-- Name: idx_generated_barcodes_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_barcodes_name ON public.generated_barcodes USING btree (name);


--
-- Name: idx_generated_barcodes_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_barcodes_name_lower ON public.generated_barcodes USING btree (lower((name)::text));


--
-- Name: idx_product_types_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_types_name ON public.product_types USING btree (name);


--
-- Name: idx_product_types_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_product_types_name_lower ON public.product_types USING btree (lower((name)::text));


--
-- Name: idx_product_types_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_product_types_name_unique ON public.product_types USING btree (lower((name)::text));


--
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_active ON public.products USING btree (id) WHERE (unit_price > (0)::numeric);


--
-- Name: idx_products_brand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_brand_id ON public.products USING btree (brand_id);


--
-- Name: idx_products_brand_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_brand_name ON public.products USING btree (brand_name);


--
-- Name: idx_products_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_id ON public.products USING btree (id);


--
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name ON public.products USING btree (name);


--
-- Name: idx_products_name_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name_search ON public.products USING gin (to_tsvector('spanish'::regconfig, (name)::text));


--
-- Name: idx_products_product_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_product_type_id ON public.products USING btree (product_type_id);


--
-- Name: idx_products_type_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_type_brand ON public.products USING btree (type_id, brand_id);


--
-- Name: idx_products_type_brand_filter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_type_brand_filter ON public.products USING btree (product_type_id, brand_id) WHERE ((product_type_id IS NOT NULL) AND (brand_id IS NOT NULL));


--
-- Name: idx_products_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_type_id ON public.products USING btree (type_id);


--
-- Name: idx_products_with_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_with_price ON public.products USING btree (id, name) WHERE (unit_price > (0)::numeric);


--
-- Name: idx_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);


--
-- Name: idx_sale_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_product_id ON public.sale_items USING btree (product_id);


--
-- Name: idx_sale_items_product_quantity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_product_quantity ON public.sale_items USING btree (product_id, quantity);


--
-- Name: idx_sale_items_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_sale_id ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sales_date_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_date_desc ON public.sales USING btree (sale_date DESC);


--
-- Name: idx_sales_date_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_date_user ON public.sales USING btree (sale_date, user_id);


--
-- Name: idx_sales_sale_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_sale_date ON public.sales USING btree (sale_date);


--
-- Name: idx_sales_ticket_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_ticket_number ON public.sales USING btree (ticket_number);


--
-- Name: idx_sales_total; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_total ON public.sales USING btree (total_amount DESC);


--
-- Name: idx_sales_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_user_date ON public.sales USING btree (user_id, sale_date DESC);


--
-- Name: idx_sales_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_user_id ON public.sales USING btree (user_id);


--
-- Name: idx_stock_entries_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_entries_barcode ON public.stock_entries USING btree (barcode);


--
-- Name: idx_stock_entries_entry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_entries_entry_date ON public.stock_entries USING btree (entry_date);


--
-- Name: idx_stock_entries_expiration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_entries_expiration ON public.stock_entries USING btree (expiration_date, entry_date) WHERE (current_quantity > 0);


--
-- Name: idx_stock_entries_expiration_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_entries_expiration_date ON public.stock_entries USING btree (expiration_date);


--
-- Name: idx_stock_entries_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_entries_product_id ON public.stock_entries USING btree (product_id);


--
-- Name: idx_stock_entries_product_remaining; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_entries_product_remaining ON public.stock_entries USING btree (product_id, current_quantity) WHERE (current_quantity > 0);


--
-- Name: idx_stock_entries_remaining_quantity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_entries_remaining_quantity ON public.stock_entries USING btree (current_quantity);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_email_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_email_lower ON public.users USING btree (lower((email)::text));


--
-- Name: idx_users_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_email_unique ON public.users USING btree (lower((email)::text));


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_role_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role_active ON public.users USING btree (role) WHERE (created_at IS NOT NULL);


--
-- Name: users on_user_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_user_created AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: brands update_brands_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: generated_barcodes update_generated_barcodes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_generated_barcodes_updated_at BEFORE UPDATE ON public.generated_barcodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_types update_product_types_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_types_updated_at BEFORE UPDATE ON public.product_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: products products_product_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_product_type_id_fkey FOREIGN KEY (product_type_id) REFERENCES public.product_types(id);


--
-- Name: products products_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.product_types(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sales sales_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: stock_entries stock_entries_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entries
    ADD CONSTRAINT stock_entries_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

