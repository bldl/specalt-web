#pragma once

#include "lexer.hpp"
#include "utils.hpp"

namespace spa
{
    struct binary;
    struct unary;
    struct literal;
    struct constant;

    using node = variant_ptr<binary, unary, literal, constant>;

    struct binary
    {
        token_type op;
        node left, right;
    };

    struct unary
    {
        token_type op;
        node value;
    };

    struct literal
    {
        std::string_view name;
    };

    struct constant
    {
        std::string_view value;
    };

    class parser
    {
        lexer m_lexer;
        res<token> m_current;

      public:
        parser(std::string_view);

      private:
        [[nodiscard]] bool is(token_type) const;

      private:
        [[nodiscard]] res<token> take();
        [[nodiscard]] res<token> take(token_type);
        [[nodiscard]] res<token> take(std::initializer_list<token_type>);

      private:
        [[nodiscard]] res<node> primary();
        [[nodiscard]] res<node> unary();

      private:
        [[nodiscard]] res<node> expr();
        [[nodiscard]] res<node> term();

      public:
        [[nodiscard]] res<node> objective();
        [[nodiscard]] res<node> constraint();
    };
} // namespace spa
