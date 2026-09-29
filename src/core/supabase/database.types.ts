export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: number;
          metadata: NonNullable<Json>;
          scope: string | null;
          target_id: string | null;
          target_table: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          metadata?: NonNullable<Json>;
          scope?: string | null;
          target_id?: string | null;
          target_table?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          metadata?: NonNullable<Json>;
          scope?: string | null;
          target_id?: string | null;
          target_table?: string | null;
        };
        Relationships: [];
      };
      contact_submissions: {
        Row: {
          company: string | null;
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          page_id: string | null;
          phone: string | null;
          source_url: string | null;
          status: Database["public"]["Enums"]["submission_status"];
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          page_id?: string | null;
          phone?: string | null;
          source_url?: string | null;
          status?: Database["public"]["Enums"]["submission_status"];
        };
        Update: {
          company?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          page_id?: string | null;
          phone?: string | null;
          source_url?: string | null;
          status?: Database["public"]["Enums"]["submission_status"];
        };
        Relationships: [
          {
            foreignKeyName: "contact_submissions_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          alt_text: string | null;
          caption: string | null;
          created_at: string;
          filename: string;
          folder_id: string | null;
          height: number | null;
          id: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          updated_at: string;
          uploaded_by: string | null;
          width: number | null;
        };
        Insert: {
          alt_text?: string | null;
          caption?: string | null;
          created_at?: string;
          filename: string;
          folder_id?: string | null;
          height?: number | null;
          id?: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          updated_at?: string;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Update: {
          alt_text?: string | null;
          caption?: string | null;
          created_at?: string;
          filename?: string;
          folder_id?: string | null;
          height?: number | null;
          id?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          updated_at?: string;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_assets_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "media_folders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      media_folders: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          parent_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          parent_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          parent_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_folders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_folders_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "media_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      media_references: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_table: string;
          field: string;
          media_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_table: string;
          field: string;
          media_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_table?: string;
          field?: string;
          media_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_references_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          link: NonNullable<Json>;
          menu_id: string;
          open_in_new_tab: boolean;
          parent_id: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          link: NonNullable<Json>;
          menu_id: string;
          open_in_new_tab?: boolean;
          parent_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          link?: NonNullable<Json>;
          menu_id?: string;
          open_in_new_tab?: boolean;
          parent_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "menus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      menus: {
        Row: {
          id: string;
          key: string;
          title: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          title?: string | null;
        };
        Update: {
          id?: string;
          key?: string;
          title?: string | null;
        };
        Relationships: [];
      };
      modules: {
        Row: {
          enabled: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          enabled?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          enabled?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "modules_key_fkey";
            columns: ["key"];
            isOneToOne: true;
            referencedRelation: "permission_scopes";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "modules_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      page_revisions: {
        Row: {
          id: string;
          page_id: string;
          published_at: string;
          published_by: string | null;
          sections: NonNullable<Json>;
        };
        Insert: {
          id?: string;
          page_id: string;
          published_at?: string;
          published_by?: string | null;
          sections: NonNullable<Json>;
        };
        Update: {
          id?: string;
          page_id?: string;
          published_at?: string;
          published_by?: string | null;
          sections?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "page_revisions_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_revisions_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      page_sections: {
        Row: {
          anchor_id: string | null;
          background: string;
          created_at: string;
          id: string;
          is_hidden: boolean;
          padding: string;
          page_id: string;
          props: NonNullable<Json>;
          sort_order: number;
          type: string;
          updated_at: string;
        };
        Insert: {
          anchor_id?: string | null;
          background?: string;
          created_at?: string;
          id?: string;
          is_hidden?: boolean;
          padding?: string;
          page_id: string;
          props?: NonNullable<Json>;
          sort_order: number;
          type: string;
          updated_at?: string;
        };
        Update: {
          anchor_id?: string | null;
          background?: string;
          created_at?: string;
          id?: string;
          is_hidden?: boolean;
          padding?: string;
          page_id?: string;
          props?: NonNullable<Json>;
          sort_order?: number;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
        ];
      };
      pages: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_home: boolean;
          og_image_media_id: string | null;
          published_at: string | null;
          published_sections: NonNullable<Json>;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          status: Database["public"]["Enums"]["page_status"];
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_home?: boolean;
          og_image_media_id?: string | null;
          published_at?: string | null;
          published_sections?: NonNullable<Json>;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["page_status"];
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_home?: boolean;
          og_image_media_id?: string | null;
          published_at?: string | null;
          published_sections?: NonNullable<Json>;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["page_status"];
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pages_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pages_og_image_media_id_fkey";
            columns: ["og_image_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pages_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      permission_scopes: {
        Row: {
          key: string;
          kind: string;
          label: string;
          sort_order: number;
        };
        Insert: {
          key: string;
          kind: string;
          label: string;
          sort_order?: number;
        };
        Update: {
          key?: string;
          kind?: string;
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          is_active: boolean;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          address: string | null;
          allow_indexing: boolean;
          contact_email: string | null;
          description: string | null;
          favicon_media_id: string | null;
          footer_copyright: string | null;
          header_cta_href: string | null;
          header_cta_label: string | null;
          id: boolean;
          location_label: string | null;
          logo_media_id: string | null;
          logo_on_dark_media_id: string | null;
          map_url: string | null;
          og_image_media_id: string | null;
          phone: string | null;
          privacy_href: string | null;
          seo_description: string | null;
          seo_title_template: string | null;
          show_top_bar: boolean;
          site_name: string;
          social_links: NonNullable<Json>;
          tagline: string | null;
          terms_href: string | null;
          theme: NonNullable<Json>;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          address?: string | null;
          allow_indexing?: boolean;
          contact_email?: string | null;
          description?: string | null;
          favicon_media_id?: string | null;
          footer_copyright?: string | null;
          header_cta_href?: string | null;
          header_cta_label?: string | null;
          id?: boolean;
          location_label?: string | null;
          logo_media_id?: string | null;
          logo_on_dark_media_id?: string | null;
          map_url?: string | null;
          og_image_media_id?: string | null;
          phone?: string | null;
          privacy_href?: string | null;
          seo_description?: string | null;
          seo_title_template?: string | null;
          show_top_bar?: boolean;
          site_name?: string;
          social_links?: NonNullable<Json>;
          tagline?: string | null;
          terms_href?: string | null;
          theme?: NonNullable<Json>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address?: string | null;
          allow_indexing?: boolean;
          contact_email?: string | null;
          description?: string | null;
          favicon_media_id?: string | null;
          footer_copyright?: string | null;
          header_cta_href?: string | null;
          header_cta_label?: string | null;
          id?: boolean;
          location_label?: string | null;
          logo_media_id?: string | null;
          logo_on_dark_media_id?: string | null;
          map_url?: string | null;
          og_image_media_id?: string | null;
          phone?: string | null;
          privacy_href?: string | null;
          seo_description?: string | null;
          seo_title_template?: string | null;
          show_top_bar?: boolean;
          site_name?: string;
          social_links?: NonNullable<Json>;
          tagline?: string | null;
          terms_href?: string | null;
          theme?: NonNullable<Json>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "site_settings_favicon_media_fk";
            columns: ["favicon_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_settings_logo_media_fk";
            columns: ["logo_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_settings_logo_on_dark_media_fk";
            columns: ["logo_on_dark_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_settings_og_image_media_fk";
            columns: ["og_image_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"];
          created_at: string;
          granted_by: string | null;
          id: string;
          scope: string;
          user_id: string;
        };
        Insert: {
          action: Database["public"]["Enums"]["permission_action"];
          created_at?: string;
          granted_by?: string | null;
          id?: string;
          scope: string;
          user_id: string;
        };
        Update: {
          action?: Database["public"]["Enums"]["permission_action"];
          created_at?: string;
          granted_by?: string | null;
          id?: string;
          scope?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_permissions_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_permissions_scope_fkey";
            columns: ["scope"];
            isOneToOne: false;
            referencedRelation: "permission_scopes";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "staff_permissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _publish_page: { Args: { actor: string; page: string }; Returns: number };
      _replace_draft_sections: { Args: { page: string; sections: Json }; Returns: number };
      admin_list_staff: {
        Args: { target_user?: string };
        Returns: {
          avatar_url: string;
          created_at: string;
          email: string;
          email_confirmed_at: string;
          full_name: string;
          id: string;
          invited_at: string;
          is_active: boolean;
          last_sign_in_at: string;
          permission_count: number;
        }[];
      };
      bootstrap_super_admin: {
        Args: { expected_email: string; target_user: string };
        Returns: boolean;
      };
      can: {
        Args: { act: Database["public"]["Enums"]["permission_action"]; scope_key: string };
        Returns: boolean;
      };
      current_app_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      discard_draft: { Args: { page: string }; Returns: undefined };
      get_my_permissions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          action: Database["public"]["Enums"]["permission_action"];
          scope: string;
        }[];
      };
      has_permission: {
        Args: { act: Database["public"]["Enums"]["permission_action"]; scope_key: string };
        Returns: boolean;
      };
      is_staff_or_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      log_audit: {
        Args: {
          action: string;
          metadata?: Json;
          scope?: string;
          target_id?: string;
          target_table?: string;
        };
        Returns: undefined;
      };
      media_ids_in: { Args: { doc: Json }; Returns: string[] };
      module_enabled: { Args: { scope_key: string }; Returns: boolean };
      page_draft_snapshot: { Args: { page: string }; Returns: Json };
      publish_page: { Args: { page: string }; Returns: undefined };
      reorder_sections: { Args: { ordered_ids: string[]; page: string }; Returns: undefined };
      restore_revision: { Args: { revision: string }; Returns: undefined };
      set_home_page: { Args: { page: string }; Returns: undefined };
      set_media_reference: {
        Args: { entity_id: string; entity_table: string; field: string; media_id: string };
        Returns: undefined;
      };
      set_module_enabled: { Args: { enabled: boolean; module_key: string }; Returns: undefined };
      set_staff_permissions: {
        Args: { permissions: Json; target_user: string };
        Returns: undefined;
      };
      set_user_active: { Args: { active: boolean; target_user: string }; Returns: undefined };
      set_user_role: {
        Args: { new_role: Database["public"]["Enums"]["app_role"]; target_user: string };
        Returns: undefined;
      };
      submit_contact_form: {
        Args: {
          company?: string;
          email: string;
          message: string;
          name: string;
          page_id: string;
          phone?: string;
          source_url?: string;
        };
        Returns: string;
      };
      sync_media_references: {
        Args: { entity_id: string; entity_table: string; field: string; media_ids: string[] };
        Returns: undefined;
      };
      system_publish_page: { Args: { page: string }; Returns: undefined };
      unpublish_page: { Args: { page: string }; Returns: undefined };
      update_site_settings: { Args: { changes: Json }; Returns: string[] };
    };
    Enums: {
      app_role: "super_admin" | "staff" | "user";
      page_status: "draft" | "published";
      permission_action: "view" | "create" | "edit" | "delete" | "publish";
      submission_status: "new" | "read" | "archived";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "staff", "user"],
      page_status: ["draft", "published"],
      permission_action: ["view", "create", "edit", "delete", "publish"],
      submission_status: ["new", "read", "archived"],
    },
  },
} as const;
