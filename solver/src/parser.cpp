#include "parser.hpp"

#include <format>
#include <ranges>

#include <utility>

namespace jspl
{
    parser::parser(std::string_view source) : m_lexer(source)
    {
        std::ignore = take();
    }

    bool parser::is(token_type type) const
    {
        return m_current && m_current->type == type;
    }

    res<token> parser::take()
    {
        auto rtn  = std::move(m_current);
        m_current = m_lexer.next();
        return rtn;
    }

    res<token> parser::take(token_type type)
    {
        if (!is(type))
        {
            return err{std::format("Expected <{}>", std::to_underlying(type))};
        }

        return take();
    }

    res<token> parser::take(std::initializer_list<token_type> allowed)
    {
        for (const auto &type : allowed)
        {
            auto rtn = take(type);

            if (!rtn)
            {
                continue;
            }

            return rtn;
        }

        // Emscriptens libc++ does not have std::views::join_with
        // yet, so we'll have to it the ugly way :/

        auto str = std::string{};

        for (const auto &type : allowed)
        {
            str += std::format("{},", std::to_underlying(type));
        }

        str.pop_back();

        return err{std::format("Expected one of <{}>", str)};
    }

    res<node> parser::primary()
    {
        if (auto tok = take(token_type::literal); tok)
        {
            return std::make_unique<jspl::literal>(tok->value);
        }

        if (auto tok = take(token_type::constant); tok)
        {
            return std::make_unique<jspl::constant>(tok->value);
        }

        return err{"Expected primary"};
    }

    res<node> parser::unary()
    {
        auto op = take(token_type::minus);

        if (!op)
        {
            return err{op.error()};
        }

        auto prim = primary();

        if (!prim)
        {
            return prim;
        }

        return std::make_unique<jspl::unary>(op->type, std::move(prim.value()));
    }

    res<node> parser::expr()
    {
        return unary().or_else(bind_ignore(&parser::primary, this));
    }

    res<node> parser::term()
    {
        using enum token_type;

        auto left = expr();

        if (!left)
        {
            return left;
        }

        auto op = res<token>{};

        while ((op = take({plus, minus})))
        {
            auto right = expr();

            if (!right)
            {
                return right;
            }

            left = std::make_unique<jspl::binary>(op->type, std::move(left.value()), std::move(right.value()));
        }

        return left;
    }

    res<node> parser::objective()
    {
        using enum token_type;

        auto rtn = term();

        if (auto res = take(eof); !res)
        {
            return err{res.error()};
        }

        return rtn;
    }

    res<node> parser::constraint()
    {
        using enum token_type;

        auto left = term();

        if (!left)
        {
            return left;
        }

        auto op = take({lt, gt, leq, geq, eq, neq});

        if (!op)
        {
            return err{op.error()};
        }

        auto right = term();

        if (!right)
        {
            return right;
        }

        if (auto res = take(eof); !res)
        {
            return err{res.error()};
        }

        return std::make_unique<jspl::binary>(op->type, std::move(left.value()), std::move(right.value()));
    }
} // namespace jspl
